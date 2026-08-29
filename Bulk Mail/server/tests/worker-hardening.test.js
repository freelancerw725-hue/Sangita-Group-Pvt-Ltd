import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-mail-worker-hardening-'))
process.env.NODE_ENV = 'test'
process.env.DB_PATH = path.join(tempDir, 'crm.db')
process.env.DEFAULT_ADMIN_EMAIL = 'admin@test.local'
process.env.DEFAULT_ADMIN_PASSWORD = 'super-secret'

const { db } = await import('../db/connection.js')
const batchImport = await import('../services/batch-import.service.js')
const campaignsService = await import('../services/campaigns.service.js')
const templatesService = await import('../services/templates.service.js')
const sendersService = await import('../services/senders.service.js')
const execution = await import('../services/campaign-execution.service.js')
const { nowSqlMs } = await import('../lib/format.js')

function createSender(dailyLimit = 100, hourlyLimit = 50) {
  return sendersService.createSender({
    name: `Sender ${crypto.randomUUID().slice(0,6)}`,
    email: `sender_${crypto.randomUUID().slice(0,8)}@example.com`,
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'user',
    password: 'pass',
    securityMode: 'tls',
    dailyLimit,
    hourlyLimit,
    enabled: true,
  })
}

function createBatchWithLeads(count, tplId) {
  const rand = crypto.randomUUID().slice(0,8)
  const imp = batchImport.importLeadsFromSheet({
    sheetId: `sheet_worker_${rand}`,
    sheetName: `Worker Sheet ${rand}`,
    templateId: tplId,
    leads: Array.from({ length: count }, (_, i) => ({
      id: `lead_${rand}_${i}`,
      email: `worker_${rand}_${i}@example.com`,
      name: `Lead ${i}`,
      company: `Company ${i}`,
    })),
  })
  return imp
}

function fakeProvider() {
  return {
    sendEmail: async () => ({ ok: true, messageId: `<test@test.com>`, accepted: ['a@test.com'], rejected: [] }),
  }
}

test.beforeEach(() => {
  db.exec(`DELETE FROM email_events; DELETE FROM email_queue; DELETE FROM campaign_recipients; DELETE FROM emails; DELETE FROM campaigns;`)
})

test('1. Future campaign.scheduled_at does NOT send', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Future Camp ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  // Set campaign scheduled_at to future (1 hour from now)
  const future = nowSqlMs(3600000)
  db.prepare(`UPDATE campaigns SET scheduled_at = ?, updated_at = datetime('now') WHERE id = ?`).run(future, campaign.id)
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 0)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 0)
  assert.equal(prog.pending, 1)
})

test('2. Future campaign.scheduled_at does NOT process queue row', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Future Queue ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const future = nowSqlMs(3600000)
  db.prepare(`UPDATE campaigns SET scheduled_at = ? WHERE id = ?`).run(future, campaign.id)
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  // Directly check queueCandidateRows via processQueueTick
  const tick = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(tick.processed, 0)
})

test('3. Campaign sends when scheduled_at <= now', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Due Camp ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const past = nowSqlMs(-1000)
  db.prepare(`UPDATE campaigns SET scheduled_at = ? WHERE id = ?`).run(past, campaign.id)
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 1)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 1)
})

test('4. campaign.scheduled_at NULL continues to work', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Null Sched ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  // Ensure scheduled_at is NULL (default)
  const row = db.prepare(`SELECT scheduled_at FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.scheduled_at, null)
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 1)
})

test('5. email_queue.scheduled_at future continues to wait', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Queue Future ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  // Push scheduled_at to future
  const future = nowSqlMs(3600000)
  db.prepare(`UPDATE email_queue SET scheduled_at = ? WHERE campaign_id = ?`).run(future, campaign.id)
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 0)
  // Make it due and try again
  const past = nowSqlMs(-1000)
  db.prepare(`UPDATE email_queue SET scheduled_at = ? WHERE campaign_id = ?`).run(past, campaign.id)
  const result2 = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result2.processed, 1)
})

test('6. email_queue.scheduled_at due can process', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Queue Due ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const past = nowSqlMs(-1000)
  db.prepare(`UPDATE email_queue SET scheduled_at = ? WHERE campaign_id = ?`).run(past, campaign.id)
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 1)
})

test('7. paused campaign does not send', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Paused ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  execution.pauseCampaign(campaign.id)
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 0)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 0)
  assert.equal(prog.pending, 1)
})

test('8. cancelled campaign does not send', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Cancelled ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  execution.cancelCampaign(campaign.id)
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 0)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 0)
  // Queue should be cancelled, not pending
  const cancelled = db.prepare(`SELECT COUNT(*) c FROM email_queue WHERE campaign_id = ? AND status = 'cancelled'`).get(campaign.id).c
  assert.equal(cancelled, 1)
})

test('9. completed campaign does not send', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Completed ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  // Now campaign should be completed (1 sent, 0 pending)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 1)
  const summary = execution.getCampaignRunSummary(campaign.id)
  assert.equal(summary.status, 'completed')
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 0)
})

test('10. daily limit still works', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(2, tpl.id)
  const sender = createSender(1, 1) // daily 1, hourly 1
  const { campaign } = campaignsService.createCampaign({
    name: `Daily ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 1,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 2)
  const rows = db.prepare(`SELECT status FROM email_queue WHERE campaign_id = ? ORDER BY id`).all(campaign.id)
  assert.equal(rows[0].status, 'sent')
  assert.equal(rows[1].status, 'retry')
})

test('11. hourly limit still works', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(2, tpl.id)
  const sender = sendersService.createSender({
    name: `Sender ${crypto.randomUUID().slice(0,6)}`,
    email: `sender_${crypto.randomUUID().slice(0,8)}@example.com`,
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'user',
    password: 'pass',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 1,
    enabled: true,
  })
  const { campaign } = campaignsService.createCampaign({
    name: `Hourly ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const result = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(result.processed, 2)
  const rows = db.prepare(`SELECT status FROM email_queue WHERE campaign_id = ? ORDER BY id`).all(campaign.id)
  assert.equal(rows[0].status, 'sent')
  assert.equal(rows[1].status, 'retry')
})

test('12. existing SMTP send behavior still works', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi {{company}}', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `SMTP ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const result = await execution.processQueueTick({
    providerFactory: () => ({
      sendEmail: async () => ({ ok: true, messageId: '<smtp@test.com>' }),
    }),
  })
  assert.equal(result.processed, 1)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 1)
  const email = db.prepare(`SELECT status, provider_message_id FROM emails WHERE campaign_id = ?`).get(campaign.id)
  assert.equal(email.status, 'sent')
})

test('13. no duplicate queue', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `DupQueue ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const first = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(first.queued, 1)
  const second = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(second.queued, 0)
  const count = db.prepare(`SELECT COUNT(*) c FROM email_queue WHERE campaign_id = ?`).get(campaign.id).c
  assert.equal(count, 1)
})

test('14. no duplicate send', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `DupSend ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  const again = await execution.processQueueTick({ providerFactory: () => fakeProvider() })
  assert.equal(again.processed, 0)
  const prog = execution.getCampaignProgress(campaign.id)
  assert.equal(prog.sent, 1)
})

test('15. existing campaign lifecycle remains intact', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender()
  const { campaign } = campaignsService.createCampaign({
    name: `Lifecycle ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  let row = db.prepare(`SELECT run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.run_status, 'draft')
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  row = db.prepare(`SELECT run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.run_status, 'running')
  execution.pauseCampaign(campaign.id)
  row = db.prepare(`SELECT run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.run_status, 'paused')
  execution.resumeCampaign(campaign.id, { senderAccountId: sender.id })
  row = db.prepare(`SELECT run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.run_status, 'running')
  execution.cancelCampaign(campaign.id)
  row = db.prepare(`SELECT run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.run_status, 'cancelled')
})

test.after(() => {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

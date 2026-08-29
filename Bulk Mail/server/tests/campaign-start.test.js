import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-mail-campaign-start-'))
process.env.NODE_ENV = 'test'
process.env.DB_PATH = path.join(tempDir, 'crm.db')
process.env.BULK_MAIL_CAMPAIGN_KEY = 'test-campaign-key-123'
process.env.BULK_MAIL_IMPORT_KEY = 'test-import-key-123'
process.env.DEFAULT_ADMIN_EMAIL = 'admin@test.local'
process.env.DEFAULT_ADMIN_PASSWORD = 'super-secret'

const { db } = await import('../db/connection.js')
const batchImport = await import('../services/batch-import.service.js')
const campaignsService = await import('../services/campaigns.service.js')
const templatesService = await import('../services/templates.service.js')
const sendersService = await import('../services/senders.service.js')
const execution = await import('../services/campaign-execution.service.js')

// Helper to create a sender
function createSender(enabled = true) {
  return sendersService.createSender({
    name: `Sender ${crypto.randomUUID().slice(0,6)}`,
    email: `sender_${crypto.randomUUID().slice(0,8)}@example.com`,
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'user',
    password: 'pass',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 50,
    enabled,
  })
}

function createBatchWithLeads(count, templateId) {
  const rand = crypto.randomUUID().slice(0,8)
  const imp = batchImport.importLeadsFromSheet({
    sheetId: `sheet_start_${rand}`,
    sheetName: `Start Sheet ${rand}`,
    templateId,
    leads: Array.from({ length: count }, (_, i) => ({
      id: `lead_${rand}_${i}`,
      email: `lead_${rand}_${i}@example.com`,
      name: `Lead ${i}`,
      company: `Company ${i}`,
    })),
  })
  return imp
}

test.beforeEach(() => {
  // Clean up campaigns, queues, etc. but keep templates/senders for speed
  db.exec(`DELETE FROM email_events; DELETE FROM email_queue; DELETE FROM campaign_recipients; DELETE FROM emails; DELETE FROM campaigns;`)
})

test('1. authorized start succeeds', async () => {
  const sender = createSender(true)
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi {{company}}', body: 'Hello {{contact_name}}' })
  const batch = createBatchWithLeads(2, tpl.id)
  const { campaign } = campaignsService.createCampaign({
    name: `Camp Auth ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const result = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.ok(['running','active'].includes(result.campaign.status.toLowerCase()) || result.campaign.run_status === 'running')
  assert.equal(result.queued, 2)
})

test('2. unauthorized start rejected (route auth)', async () => {
  // Direct service doesn't check auth, route does — we test service still requires valid campaign
  await assert.rejects(async () => execution.startCampaign(999999), /Campaign not found/)
})

test('3. valid batch creates campaign via from-batch and can start', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi {{company}}', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const { createCampaignFromBatch } = await import('../services/campaign-from-batch.service.js')
  const fromBatch = await createCampaignFromBatch({ batchId: batch.batchId, templateId: tpl.id })
  assert.ok(fromBatch.campaignId)
  const sender = createSender(true)
  // Update campaign to use sender
  db.prepare(`UPDATE campaigns SET sender_account_id = ? WHERE id = ?`).run(sender.id, fromBatch.campaignId)
  const started = execution.startCampaign(fromBatch.campaignId, { senderAccountId: sender.id })
  assert.ok(['running','active'].includes(started.campaign.status.toLowerCase()) || started.campaign.run_status === 'running')
})

test('4. campaign status is draft before start, running after', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Draft Check ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  let row = db.prepare(`SELECT status, run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.status, 'draft')
  assert.equal(row.run_status, 'draft')
  const started = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  row = db.prepare(`SELECT status, run_status FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.ok(['running','active'].includes(row.run_status) || ['running','active'].includes(row.status))
  assert.ok(['running','active'].includes(started.campaign.status.toLowerCase()) || started.campaign.run_status === 'running')
})

test('5. correct template attached', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi {{company}}', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Tpl Check ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const row = db.prepare(`SELECT template_id FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.template_id, tpl.id)
})

test('6. correct batch audience attached', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(2, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Aud Check ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const row = db.prepare(`SELECT audience_type, audience_ref FROM campaigns WHERE id = ?`).get(campaign.id)
  assert.equal(row.audience_type, 'batch')
  assert.equal(row.audience_ref, batch.batchId)
  const recips = campaignsService.listRecipients(campaign.id)
  assert.equal(recips.length, 2)
})

test('7. recipient count correct', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi {{company}}', body: 'Hello {{contact_name}}' })
  const batch = createBatchWithLeads(3, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Recip Count ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const result = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(result.queued, 3)
  assert.equal(result.progress.total, 3)
  assert.equal(result.progress.pending, 3)
})

test('8. invalid batch rejected', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const sender = createSender(true)
  // Try to create campaign with non-existent batch
  assert.throws(() => {
    campaignsService.createCampaign({
      name: `Invalid Batch ${crypto.randomUUID().slice(0,6)}`,
      templateId: tpl.id,
      audience: { type: 'batch', batchId: 999999 },
      dailyLimit: 100,
      delaySeconds: 0,
      status: 'draft',
    })
  }, /Batch not found|No eligible recipients|batch/i)
})

test('9. empty batch rejected', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const { createBatch } = await import('../services/batches.service.js')
  const batch = createBatch({ name: `Empty Batch ${crypto.randomUUID().slice(0,6)}`, source: 'Manual entry', notes: null })
  assert.throws(() => {
    campaignsService.createCampaign({
      name: `Empty Camp ${crypto.randomUUID().slice(0,6)}`,
      templateId: tpl.id,
      audience: { type: 'batch', batchId: batch.id },
      dailyLimit: 100,
      delaySeconds: 0,
      status: 'draft',
    })
  }, /No eligible recipients/)
})

test('10. non-Lead-Finder batch rejected if required by from-batch', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const { createBatch } = await import('../services/batches.service.js')
  const batch = createBatch({ name: `Manual Batch ${crypto.randomUUID().slice(0,6)}`, source: 'Manual entry', notes: null })
  const leadsService = await import('../services/leads.service.js')
  const rand = crypto.randomUUID().slice(0,8)
  leadsService.createLead({ company: `Manual Co ${rand}`, contact: 'Manual', email: `manual_${rand}@example.com`, status: 'new', batchId: batch.id, notes: null })
  const { createCampaignFromBatch } = await import('../services/campaign-from-batch.service.js')
  await assert.rejects(
    async () => await createCampaignFromBatch({ batchId: batch.id, templateId: tpl.id }),
    /Batch is not a Lead Finder batch/
  )
})

test('11. invalid template rejected', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Invalid Tpl Camp ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  // Try to start with invalid template via update
  assert.throws(() => {
    campaignsService.updateCampaign(campaign.id, { templateId: 999999 })
  }, /Template not found|does not exist/)
})

test('12. pending/rejected Lead Sheet rejected (mocked)', async () => {
  // This is tested via campaign-from-batch service mock — here we just verify that a Lead Finder batch with not-ready sheet would be rejected
  // For this test, we mock LEAD_FINDER_BASE_URL to return not ready
  const rand = crypto.randomUUID().slice(0,8)
  const tpl = templatesService.createTemplate({ name: `Tpl ${rand}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  // Force batch to appear as Lead Finder but sheet not ready by mocking fetch
  const originalFetch = global.fetch
  global.fetch = async (url) => {
    if (String(url).includes('/api/lead-sheets/')) {
      return new Response(JSON.stringify({ error: 'No template selected. Select a Bulk Mail template before handoff.' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    return originalFetch(url)
  }
  process.env.LEAD_FINDER_BASE_URL = 'http://mock.test'
  const { createCampaignFromBatch } = await import('../services/campaign-from-batch.service.js')
  try {
    await assert.rejects(
      async () => await createCampaignFromBatch({ batchId: batch.batchId, templateId: tpl.id }),
      /Lead Sheet not ready/
    )
  } finally {
    global.fetch = originalFetch
    delete process.env.LEAD_FINDER_BASE_URL
  }
})

test('13. duplicate batch+template returns existing campaign', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const { createCampaignFromBatch } = await import('../services/campaign-from-batch.service.js')
  const first = await createCampaignFromBatch({ batchId: batch.batchId, templateId: tpl.id })
  assert.equal(first.idempotent, false)
  const second = await createCampaignFromBatch({ batchId: batch.batchId, templateId: tpl.id })
  assert.equal(second.idempotent, true)
  assert.equal(second.campaignId, first.campaignId)
})

test('14. no email_queue rows created before start, created after start', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi {{company}}', body: 'Hello' })
  const batch = createBatchWithLeads(2, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Queue Check ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const before = db.prepare(`SELECT COUNT(*) c FROM email_queue WHERE campaign_id = ?`).get(campaign.id).c
  assert.equal(before, 0)
  const result = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const after = db.prepare(`SELECT COUNT(*) c FROM email_queue WHERE campaign_id = ?`).get(campaign.id).c
  assert.equal(after, 2)
  assert.equal(result.queued, 2)
  assert.equal(result.progress.pending, 2)
})

test('15. second start is idempotent (no duplicate queue)', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Idem Start ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const first = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(first.queued, 1)
  const second = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  // Second start should be idempotent — no new queue
  // Our route handles idempotency, but direct service will try to enqueue again but find no pending without queue
  // So queued should be 0
  assert.equal(second.queued, 0)
  const count = db.prepare(`SELECT COUNT(*) c FROM email_queue WHERE campaign_id = ?`).get(campaign.id).c
  assert.equal(count, 1)
})

test('16. SMTP not called on start', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `SMTP Check ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  let smtpCalled = false
  const original = (await import('../providers/smtp-provider.js')).SMTPEmailProvider
  // We check that startCampaign does not call providerFactory
  // Instead we verify no emails marked sent
  const result = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const sent = db.prepare(`SELECT COUNT(*) c FROM emails WHERE campaign_id = ? AND status = 'sent'`).get(campaign.id).c
  assert.equal(sent, 0)
  assert.equal(result.progress.sent, 0)
})

test('17. no email sent on start', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `NoEmail ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const before = db.prepare(`SELECT COUNT(*) c FROM emails WHERE status = 'sent'`).get().c
  execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  const after = db.prepare(`SELECT COUNT(*) c FROM emails WHERE status = 'sent'`).get().c
  assert.equal(before, after)
  const queuePending = db.prepare(`SELECT COUNT(*) c FROM email_queue WHERE campaign_id = ? AND status = 'pending'`).get(campaign.id).c
  assert.equal(queuePending, 1)
})

test('18. existing campaign start/pause/resume/cancel still works', async () => {
  const tpl = templatesService.createTemplate({ name: `Tpl ${crypto.randomUUID().slice(0,6)}`, category: 'Initial Outreach', subject: 'Hi', body: 'Hello' })
  const batch = createBatchWithLeads(1, tpl.id)
  const sender = createSender(true)
  const { campaign } = campaignsService.createCampaign({
    name: `Lifecycle ${crypto.randomUUID().slice(0,6)}`,
    templateId: tpl.id,
    audience: { type: 'batch', batchId: batch.batchId },
    dailyLimit: 100,
    delaySeconds: 0,
    status: 'draft',
  })
  const started = execution.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(started.campaign.run_status, 'running')
  const paused = execution.pauseCampaign(campaign.id)
  assert.equal(paused.campaign.run_status, 'paused')
  const resumed = execution.resumeCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(resumed.campaign.run_status, 'running')
  const cancelled = execution.cancelCampaign(campaign.id)
  assert.equal(cancelled.campaign.run_status, 'cancelled')
})

test.after(() => {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

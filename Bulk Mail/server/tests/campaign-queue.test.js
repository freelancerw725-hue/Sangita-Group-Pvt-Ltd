import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-mail-campaign-queue-'))
process.env.NODE_ENV = 'test'
process.env.DB_PATH = path.join(tempDir, 'crm.db')
process.env.DEFAULT_ADMIN_EMAIL = 'admin@test.local'
process.env.DEFAULT_ADMIN_PASSWORD = 'super-secret'

const { db } = await import('../db/connection.js')
const leads = await import('../services/leads.service.js')
const templates = await import('../services/templates.service.js')
const blocked = await import('../services/blocked.service.js')
const senders = await import('../services/senders.service.js')
const campaigns = await import('../services/campaigns.service.js')
const queue = await import('../services/campaign-execution.service.js')

function resetTables() {
  db.exec(`
    DELETE FROM email_events;
    DELETE FROM email_queue;
    DELETE FROM campaign_recipients;
    DELETE FROM emails;
    DELETE FROM campaigns;
    DELETE FROM blocked_contacts;
    DELETE FROM leads;
    DELETE FROM templates;
    DELETE FROM sender_accounts;
    DELETE FROM activities;
  `)
}

function createBaseCampaign({ senderId, status = 'draft', leadIds, delaySeconds = 1 }) {
  return campaigns.createCampaign({
    name: 'Queue Campaign',
    templateId: templates.createTemplate({
      name: 'Queue Template',
      category: 'Initial Outreach',
      subject: 'Hello {{company}}',
      body: 'Hi {{contact_name}} at {{company}}',
    }).id,
    senderAccountId: senderId,
    audience: { type: 'manual', leadIds },
    dailyLimit: 100,
    delaySeconds,
    status,
  }).campaign
}

function fakeProvider({ success = true, messageId = '<msg@test.local>', error = new Error('smtp failed') } = {}) {
  return {
    sendEmail: async () => {
      if (!success) return { ok: false, error }
      return { ok: true, messageId, accepted: ['recipient@test.local'], rejected: [] }
    },
  }
}

test.beforeEach(() => {
  resetTables()
})

test('resolves recipients, removes duplicates, and excludes blocked contacts', () => {
  const sender = senders.createSender({
    name: 'Campaign Sender',
    email: 'sender@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'sender@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 50,
    enabled: true,
  })

  const a = leads.createLead({ company: 'Alpha', contact: 'A', email: 'alpha@example.com', status: 'new', batchId: null, notes: null })
  const b = leads.createLead({ company: 'Beta', contact: 'B', email: 'beta@example.com', status: 'new', batchId: null, notes: null })
  const c = leads.createLead({ company: 'Gamma', contact: 'G', email: 'gamma@example.com', status: 'new', batchId: null, notes: null })
  blocked.blockContact({ email: 'gamma@example.com', company: 'Gamma', reason: 'Asked Not To Contact', notes: null })

  const result = campaigns.createCampaign({
    name: 'Recipient Test',
    templateId: templates.createTemplate({
      name: 'Recipient Template',
      category: 'Initial Outreach',
      subject: 'Hello {{company}}',
      body: 'Hi {{contact_name}} at {{company}}',
    }).id,
    senderAccountId: sender.id,
    audience: { type: 'manual', leadIds: [a.id, a.id, b.id, c.id] },
    dailyLimit: 100,
    delaySeconds: 1,
    status: 'draft',
  })

  assert.equal(result.excludedBlocked, 1)
  assert.equal(result.duplicatesRemoved, 1)
  assert.equal(result.excludedInvalid, 0)
  assert.equal(campaigns.listRecipients(result.campaign.id).length, 2)
})

test('creates queue records and renders the template on start', () => {
  const sender = senders.createSender({
    name: 'Start Sender',
    email: 'start@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'start@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 50,
    enabled: true,
  })
  const lead = leads.createLead({ company: 'Queue Co', contact: 'Q Lead', email: 'queue@example.com', status: 'new', batchId: null, notes: null })
  const campaign = createBaseCampaign({ senderId: sender.id, leadIds: [lead.id] })

  const started = queue.startCampaign(campaign.id, { senderAccountId: sender.id })
  assert.equal(started.progress.total, 1)
  assert.equal(started.progress.pending, 1)

  const queueRow = db.prepare(`SELECT subject, body, status, scheduled_at FROM email_queue WHERE campaign_id = ?`).get(campaign.id)
  assert.equal(queueRow.status, 'pending')
  assert.match(queueRow.subject, /Queue Co/)
  assert.match(queueRow.body, /Queue Co/)
})

test('sends queued emails, updates progress, and completes the campaign', async () => {
  const sender = senders.createSender({
    name: 'Send Sender',
    email: 'send@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'send@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 50,
    enabled: true,
  })
  const lead = leads.createLead({ company: 'Send Co', contact: 'S Lead', email: 'send@example.com', status: 'new', batchId: null, notes: null })
  const campaign = createBaseCampaign({ senderId: sender.id, leadIds: [lead.id] })
  queue.startCampaign(campaign.id, { senderAccountId: sender.id })

  const result = await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: true, messageId: '<ok@test.local>' }),
  })
  assert.equal(result.processed, 1)

  const progress = queue.getCampaignProgress(campaign.id)
  assert.equal(progress.sent, 1)
  assert.equal(progress.pending, 0)
  assert.equal(progress.failed, 0)

  const campaignState = queue.getCampaignRunSummary(campaign.id)
  assert.equal(campaignState.status, 'completed')
})

test('retries temporary failures with exponential backoff', async () => {
  const sender = senders.createSender({
    name: 'Retry Sender',
    email: 'retry@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'retry@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 50,
    enabled: true,
  })
  const lead = leads.createLead({ company: 'Retry Co', contact: 'R Lead', email: 'retry@example.com', status: 'new', batchId: null, notes: null })
  const campaign = createBaseCampaign({ senderId: sender.id, leadIds: [lead.id] })
  queue.startCampaign(campaign.id, { senderAccountId: sender.id })

  await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: false, error: Object.assign(new Error('temporary outage'), { responseCode: 421 }) }),
  })

  let row = db.prepare(`SELECT status, attempts, scheduled_at FROM email_queue WHERE campaign_id = ?`).get(campaign.id)
  assert.equal(row.status, 'retry')
  assert.equal(row.attempts, 1)

  db.prepare(`UPDATE email_queue SET scheduled_at = datetime('now', '-1 minute') WHERE campaign_id = ?`).run(campaign.id)
  db.prepare(`UPDATE emails SET scheduled_at = datetime('now', '-1 minute') WHERE campaign_id = ?`).run(campaign.id)

  await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: true, messageId: '<retry-ok@test.local>' }),
  })

  row = db.prepare(`SELECT status, attempts FROM email_queue WHERE campaign_id = ?`).get(campaign.id)
  assert.equal(row.status, 'sent')
  assert.equal(row.attempts, 2)
})

test('pauses and resumes processing without losing queued rows', async () => {
  const sender = senders.createSender({
    name: 'Pause Sender',
    email: 'pause@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'pause@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 100,
    hourlyLimit: 50,
    enabled: true,
  })
  const lead = leads.createLead({ company: 'Pause Co', contact: 'P Lead', email: 'pause@example.com', status: 'new', batchId: null, notes: null })
  const campaign = createBaseCampaign({ senderId: sender.id, leadIds: [lead.id] })
  queue.startCampaign(campaign.id, { senderAccountId: sender.id })
  queue.pauseCampaign(campaign.id)

  const pausedTick = await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: true }),
  })
  assert.equal(pausedTick.processed, 0)

  queue.resumeCampaign(campaign.id, { senderAccountId: sender.id })
  const resumedTick = await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: true, messageId: '<resume@test.local>' }),
  })
  assert.equal(resumedTick.processed, 1)
})

test('respects sender rate limits', async () => {
  const sender = senders.createSender({
    name: 'Limit Sender',
    email: 'limit@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'limit@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 1,
    hourlyLimit: 1,
    enabled: true,
  })
  const lead1 = leads.createLead({ company: 'Limit One', contact: 'L1', email: 'limit1@example.com', status: 'new', batchId: null, notes: null })
  const lead2 = leads.createLead({ company: 'Limit Two', contact: 'L2', email: 'limit2@example.com', status: 'new', batchId: null, notes: null })
  const campaign = createBaseCampaign({ senderId: sender.id, leadIds: [lead1.id, lead2.id], delaySeconds: 0 })
  queue.startCampaign(campaign.id, { senderAccountId: sender.id })

  const result = await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: true, messageId: '<limit@test.local>' }),
  })

  assert.equal(result.processed, 2)
  const rows = db.prepare(`SELECT status FROM email_queue WHERE campaign_id = ? ORDER BY id`).all(campaign.id)
  assert.equal(rows[0].status, 'sent')
  assert.equal(rows[1].status, 'retry')
})

test.after(() => {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

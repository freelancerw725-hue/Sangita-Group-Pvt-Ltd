import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-mail-phase4-'))
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
const events = await import('../services/email-events.service.js')
const history = await import('../services/email-history.service.js')
const analytics = await import('../services/analytics.service.js')
const tracking = await import('../services/tracking.service.js')

function resetTables() {
  db.exec(`
    DELETE FROM email_clicks;
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
    DELETE FROM replies;
    DELETE FROM conversations;
  `)
}

function createSender() {
  return senders.createSender({
    name: 'Test Sender',
    email: 'sender@test.local',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'sender@test.local',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 200,
    hourlyLimit: 50,
    enabled: true,
  })
}

function createLead(email) {
  return leads.createLead({
    company: 'Test Co',
    contact: 'Test Lead',
    email,
    status: 'new',
    batchId: null,
    notes: null,
  })
}

function createTemplate() {
  return templates.createTemplate({
    name: 'Test Template',
    category: 'Initial Outreach',
    subject: 'Hello {{company}}',
    body: 'Hi {{contact_name}} at {{company}}',
  })
}

function fakeProvider({ success = true, messageId = '<msg@test.local>', error = new Error('smtp failed'), rejected = [] } = {}) {
  return {
    sendEmail: async () => {
      if (!success) return { ok: false, error }
      return { ok: true, messageId, accepted: ['recipient@test.local'], rejected, response: '250 OK' }
    },
  }
}

function fakeBounceProvider() {
  return {
    sendEmail: async () => ({
      ok: false,
      error: Object.assign(new Error('550 5.1.1 User unknown'), { responseCode: 550, code: 'EENVELOPE' }),
    }),
  }
}

function fakeTempFailProvider() {
  return {
    sendEmail: async () => ({
      ok: false,
      error: Object.assign(new Error('421 Temporary failure'), { responseCode: 421 }),
    }),
  }
}

// ============ EMAIL EVENT SYSTEM ============

test.beforeEach(() => { resetTables() })

test('email event creation records valid events', () => {
  const lead = createLead('evt1@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'evt1@test.local', 'track1').lastInsertRowid

  const result = events.recordEvent({ emailId, type: 'sent', meta: { test: true } })
  assert.equal(result.duplicate, false)
  assert.ok(result.id)

  const stored = db.prepare(`SELECT * FROM email_events WHERE id = ?`).get(result.id)
  assert.equal(stored.type, 'sent')
  assert.equal(stored.email_id, emailId)
  assert.ok(stored.meta)
})

test('email event rejects invalid event types', () => {
  assert.throws(() => events.recordEvent({ emailId: 1, type: 'invalid_type' }), /Invalid event type/)
})

test('email event deduplicates open events for same email', () => {
  const lead = createLead('dedup@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'dedup@test.local', 'track2').lastInsertRowid

  const first = events.recordEvent({ emailId, type: 'open' })
  assert.equal(first.duplicate, false)

  const second = events.recordEvent({ emailId, type: 'open' })
  assert.equal(second.duplicate, true)

  const count = db.prepare(`SELECT COUNT(*) c FROM email_events WHERE email_id = ? AND type = 'open'`).get(emailId).c
  assert.equal(count, 1)
})

test('email event does not deduplicate different event types', () => {
  const lead = createLead('types@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'types@test.local', 'track3').lastInsertRowid

  events.recordEvent({ emailId, type: 'open' })
  events.recordEvent({ emailId, type: 'click', meta: { targetUrl: 'https://example.com' } })
  events.recordEvent({ emailId, type: 'sent' })

  const count = db.prepare(`SELECT COUNT(*) c FROM email_events WHERE email_id = ?`).get(emailId).c
  assert.equal(count, 3)
})

test('batch event recording works', () => {
  const lead = createLead('batch@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'batch@test.local', 'track4').lastInsertRowid

  const results = events.recordEvents([
    { emailId, type: 'queued' },
    { emailId, type: 'sent', meta: { providerMessageId: '<ok@t>' } },
    { emailId, type: 'delivered' },
  ])
  assert.equal(results.length, 3)
  assert.ok(results[0].id)
  assert.ok(results[1].id)
  assert.ok(results[2].id)
})

// ============ SENT EMAIL HISTORY ============

test('sent email history lists emails with full details', () => {
  const lead = createLead('hist@test.local')
  const tpl = createTemplate()
  const sender = createSender()
  const camp = campaigns.createCampaign({
    name: 'History Campaign',
    templateId: tpl.id,
    senderAccountId: sender.id,
    audience: { type: 'manual', leadIds: [lead.id] },
    dailyLimit: 100,
    delaySeconds: 1,
    status: 'draft',
  }).campaign

  db.prepare(
    `INSERT INTO emails (campaign_id, lead_id, template_id, sender_account_id, from_email, to_email, subject, body, status, provider_message_id, sent_at, tracking_id, created_at)
     VALUES (?, ?, ?, ?, 'sender@test.local', 'hist@test.local', 'Test Subject', 'Test Body', 'sent', '<msg@test.local>', datetime('now'), ?, datetime('now'))`
  ).run(camp.id, lead.id, tpl.id, sender.id, 'hist_track')

  const result = history.listSentEmails({ campaignId: camp.id })
  assert.equal(result.data.length, 1)
  assert.equal(result.data[0].toEmail, 'hist@test.local')
  assert.equal(result.data[0].subject, 'Test Subject')
  assert.equal(result.data[0].status, 'sent')
  assert.equal(result.data[0].providerMessageId, '<msg@test.local>')
  assert.equal(result.data[0].trackingId, 'hist_track')
  assert.ok(result.pagination.total === 1)
})

test('lead email history shows complete email trail', () => {
  const lead = createLead('leadhist@test.local')
  const tpl = createTemplate()

  db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, sent_at, tracking_id, created_at)
     VALUES (?, ?, 'leadhist@test.local', 'First Email', 'Body1', 'sent', datetime('now', '-2 days'), ?, datetime('now', '-2 days'))`
  ).run(lead.id, tpl.id, 'lh1')
  db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, sent_at, tracking_id, created_at)
     VALUES (?, ?, 'leadhist@test.local', 'Second Email', 'Body2', 'failed', datetime('now', '-1 day'), ?, datetime('now', '-1 day'))`
  ).run(lead.id, tpl.id, 'lh2')

  const history2 = history.getLeadEmailHistory(lead.id)
  assert.equal(history2.length, 2)
  assert.equal(history2[0].subject, 'Second Email')
  assert.equal(history2[0].status, 'failed')
  assert.equal(history2[1].subject, 'First Email')
  assert.equal(history2[1].status, 'sent')
})

// ============ OPEN TRACKING ============

test('tracking token generation and verification', () => {
  const lead = createLead('track@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'track@test.local', 'verify_track').lastInsertRowid

  const token = tracking.generateTrackingToken(emailId, 'verify_track')
  assert.ok(token)
  assert.ok(typeof token === 'string')

  const resolved = tracking.resolveTrackingToken(token)
  assert.ok(resolved)
  assert.equal(resolved.id, emailId)
})

test('open tracking records event and updates email', () => {
  const lead = createLead('opentrack@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'opentrack@test.local', 'open_track').lastInsertRowid

  const recorded = tracking.recordOpen(emailId, { ipAddress: '127.0.0.1', userAgent: 'TestAgent' })
  assert.equal(recorded, true)

  const email = db.prepare(`SELECT opened_at FROM emails WHERE id = ?`).get(emailId)
  assert.ok(email.opened_at)

  const evts = db.prepare(`SELECT * FROM email_events WHERE email_id = ? AND type = 'open'`).all(emailId)
  assert.equal(evts.length, 1)
  assert.equal(evts[0].ip_address, '127.0.0.1')
})

test('open tracking deduplicates', () => {
  const lead = createLead('dedupopen@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'dedupopen@test.local', 'dedup_open_track').lastInsertRowid

  const first = tracking.recordOpen(emailId)
  const second = tracking.recordOpen(emailId)
  assert.equal(first, true)
  assert.equal(second, false)

  const count = db.prepare(`SELECT COUNT(*) c FROM email_events WHERE email_id = ? AND type = 'open'`).get(emailId).c
  assert.equal(count, 1)
})

// ============ CLICK TRACKING ============

test('click tracking records event and email_clicks row', () => {
  const lead = createLead('click@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'click@test.local', 'click_track').lastInsertRowid

  const recorded = tracking.recordClick(emailId, 'https://example.com/page', { ipAddress: '10.0.0.1', userAgent: 'ClickAgent' })
  assert.equal(recorded, true)

  const email = db.prepare(`SELECT clicked_at FROM emails WHERE id = ?`).get(emailId)
  assert.ok(email.clicked_at)

  const clicks = db.prepare(`SELECT * FROM email_clicks WHERE email_id = ?`).all(emailId)
  assert.equal(clicks.length, 1)
  assert.equal(clicks[0].target_url, 'https://example.com/page')
  assert.equal(clicks[0].ip_address, '10.0.0.1')

  const evts = db.prepare(`SELECT * FROM email_events WHERE email_id = ? AND type = 'click'`).all(emailId)
  assert.equal(evts.length, 1)
})

test('click tracking blocks non-http URLs', () => {
  const lead = createLead('blockclick@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'blockclick@test.local', 'block_click').lastInsertRowid

  assert.equal(tracking.recordClick(emailId, 'javascript:alert(1)'), false)
  assert.equal(tracking.recordClick(emailId, 'data:text/html,<h1>hi</h1>'), false)
  assert.equal(tracking.recordClick(emailId, 'ftp://files.example.com'), false)

  const count = db.prepare(`SELECT COUNT(*) c FROM email_clicks WHERE email_id = ?`).get(emailId).c
  assert.equal(count, 0)
})

// ============ DELIVERY / FAILURE EVENTS ============

test('processing event is recorded during queue processing', async () => {
  const sender = createSender()
  const lead = createLead('proc@test.local')
  const tpl = createTemplate()
  const camp = campaigns.createCampaign({
    name: 'Processing Campaign',
    templateId: tpl.id,
    senderAccountId: sender.id,
    audience: { type: 'manual', leadIds: [lead.id] },
    dailyLimit: 100,
    delaySeconds: 1,
    status: 'draft',
  }).campaign

  queue.startCampaign(camp.id, { senderAccountId: sender.id })

  await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: true, messageId: '<proc@test.local>' }),
  })

  const processingEvents = db.prepare(
    `SELECT * FROM email_events WHERE campaign_id = ? AND type = 'processing'`
  ).all(camp.id)
  assert.ok(processingEvents.length >= 1)
})

test('failed event records error metadata', async () => {
  const sender = createSender()
  const lead = createLead('fail@test.local')
  const tpl = createTemplate()
  const camp = campaigns.createCampaign({
    name: 'Fail Campaign',
    templateId: tpl.id,
    senderAccountId: sender.id,
    audience: { type: 'manual', leadIds: [lead.id] },
    dailyLimit: 100,
    delaySeconds: 1,
    status: 'draft',
  }).campaign

  queue.startCampaign(camp.id, { senderAccountId: sender.id })

  await queue.processQueueTick({
    providerFactory: () => fakeProvider({ success: false, error: new Error('Connection refused') }),
  })

  const failEvents = db.prepare(
    `SELECT * FROM email_events WHERE campaign_id = ? AND type IN ('failed', 'temporary_failure', 'permanent_failure')`
  ).all(camp.id)
  assert.ok(failEvents.length >= 1)
  const meta = JSON.parse(failEvents[0].meta)
  assert.ok(meta.error)
})

// ============ CAMPAIGN ANALYTICS ============

test('campaign analytics returns real counts', () => {
  const sender = createSender()
  const lead = createLead('analytics@test.local')
  const tpl = createTemplate()
  const camp = campaigns.createCampaign({
    name: 'Analytics Campaign',
    templateId: tpl.id,
    senderAccountId: sender.id,
    audience: { type: 'manual', leadIds: [lead.id] },
    dailyLimit: 100,
    delaySeconds: 1,
    status: 'draft',
  }).campaign

  // Simulate some events
  const emailId = db.prepare(
    `INSERT INTO emails (campaign_id, lead_id, template_id, sender_account_id, from_email, to_email, subject, body, status, tracking_id, sent_at, created_at)
     VALUES (?, ?, ?, ?, 'sender@test.local', 'analytics@test.local', 'Test', 'Body', 'sent', ?, datetime('now'), datetime('now'))`
  ).run(camp.id, lead.id, tpl.id, sender.id, 'anl_track').lastInsertRowid

  events.recordEvent({ emailId, campaignId: camp.id, leadId: lead.id, type: 'sent' })
  events.recordEvent({ emailId, campaignId: camp.id, leadId: lead.id, type: 'open' })
  events.recordEvent({ emailId, campaignId: camp.id, leadId: lead.id, type: 'click', meta: { targetUrl: 'https://example.com' } })

  const result = analytics.getCampaignAnalytics(camp.id)
  assert.ok(result)
  assert.equal(result.sent, 1)
  assert.equal(result.opened, 1)
  assert.equal(result.clicked, 1)
  assert.equal(result.totalRecipients, 1)
  assert.ok(result.openRate)
  assert.ok(result.clickRate)
})

test('daily statistics returns data grouped by day', () => {
  const lead = createLead('daily@test.local')
  const tpl = createTemplate()
  const emailId = db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, sent_at, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', datetime('now'), ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'daily@test.local', 'daily_track').lastInsertRowid

  events.recordEvent({ emailId, type: 'open' })

  const stats = analytics.getDailyStatistics(7)
  assert.ok(Array.isArray(stats.emailsSent))
  assert.ok(Array.isArray(stats.replies))
  assert.ok(Array.isArray(stats.opens))
  assert.ok(Array.isArray(stats.clicks))
  assert.ok(Array.isArray(stats.newLeads))
  assert.ok(Array.isArray(stats.interestedLeads))
})

test('monthly statistics returns correct period data', () => {
  const lead = createLead('monthly@test.local')
  const tpl = createTemplate()
  db.prepare(
    `INSERT INTO emails (lead_id, template_id, to_email, subject, body, status, sent_at, tracking_id, created_at) VALUES (?, ?, ?, 'Sub', 'Body', 'sent', datetime('now'), ?, datetime('now'))`
  ).run(lead.id, tpl.id, 'monthly@test.local', 'monthly_track')

  const now = new Date()
  const result = analytics.getMonthlyStatistics({ year: now.getFullYear(), month: now.getMonth() + 1 })
  assert.ok(result)
  assert.ok(result.period)
  assert.equal(typeof result.emailsSent, 'number')
  assert.ok(result.replyRate !== undefined)
})

test('monthly statistics supports custom date range', () => {
  const result = analytics.getMonthlyStatistics({
    from: '2026-01-01 00:00:00',
    to: '2026-12-31 23:59:59',
  })
  assert.ok(result)
  assert.equal(result.period.from, '2026-01-01 00:00:00')
  assert.equal(result.period.to, '2026-12-31 23:59:59')
})

test('dashboard analytics returns real data', () => {
  const result = analytics.getDashboardAnalytics()
  assert.ok(result.stats)
  assert.equal(typeof result.stats.totalLeads, 'number')
  assert.equal(typeof result.stats.emailsSent, 'number')
  assert.equal(typeof result.stats.emailsFailed, 'number')
  assert.equal(typeof result.stats.emailsBounced, 'number')
  assert.equal(typeof result.stats.totalOpened, 'number')
  assert.equal(typeof result.stats.totalClicked, 'number')
  assert.ok(Array.isArray(result.emailsSentChart))
  assert.ok(Array.isArray(result.newLeadsChart))
  assert.ok(Array.isArray(result.batchAnalytics))
  assert.ok(Array.isArray(result.campaignAnalytics))
})

test.after(() => {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

import crypto from 'node:crypto'
import { db, transaction } from '../db/connection.js'
import { badRequest, notFound } from '../lib/errors.js'
import { nowSql, fmtDateTime } from '../lib/format.js'
import { normalizeEmail } from '../lib/normalize.js'
import { recordActivity } from './activities.service.js'
import { renderTemplate, hasUnresolvedVariables, getTemplate } from './templates.service.js'
import { getDefaultSenderRecord, getSenderRecord } from './senders.service.js'
import { SMTPEmailProvider } from '../providers/smtp-provider.js'

function generateTrackingId() {
  return crypto.randomBytes(16).toString('hex')
}

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS = 5
const RETRY_BASE_MS = 5 * 60 * 1000

function campaignRow(id) {
  const row = db.prepare(
    `SELECT c.*, t.name AS template_name, b.name AS batch_name, s.name AS sender_name, s.email AS sender_email
     FROM campaigns c
     LEFT JOIN templates t ON t.id = c.template_id
     LEFT JOIN lead_batches b ON b.id = c.audience_ref
     LEFT JOIN sender_accounts s ON s.id = c.sender_account_id
     WHERE c.id = ?`
  ).get(id)
  if (!row) throw notFound('Campaign not found')
  return row
}

function toDbDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function plusMs(ms) {
  return toDbDate(new Date(Date.now() + ms))
}

function campaignCanonicalStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'running') return 'running'
  if (s === 'paused') return 'paused'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'completed') return 'completed'
  return 'draft'
}

function campaignLegacyStatus(runStatus) {
  const s = campaignCanonicalStatus(runStatus)
  if (s === 'running') return 'active'
  return s
}

function leadVariables(lead) {
  return {
    company: lead.company || '',
    contact_name: lead.contact || '',
    email: lead.email || '',
    website: lead.website || '',
    category: lead.category || '',
    location: lead.location || '',
  }
}

function renderLeadTemplate(template, lead) {
  const values = leadVariables(lead)
  const subject = renderTemplate(template.subject, values)
  const body = renderTemplate(template.body, values)
  return { subject, body, unresolved: hasUnresolvedVariables(subject) || hasUnresolvedVariables(body) }
}

function senderForCampaign(campaign) {
  if (campaign.sender_account_id) return getSenderRecord(campaign.sender_account_id)
  return getDefaultSenderRecord()
}

function providerForSender(senderRow, options = {}) {
  if (options.providerFactory) return options.providerFactory(senderRow, options)
  return new SMTPEmailProvider(senderRow)
}

function isRetryableError(error) {
  if (!error) return false
  const code = String(error.code || '').toUpperCase()
  const statusCode = Number(error.responseCode || error.statusCode || 0)
  if (code && ['EAUTH'].includes(code)) return false
  if (statusCode >= 500 || [429, 421, 450, 451, 452].includes(statusCode)) return true
  const message = String(error.message || '').toLowerCase()
  return /timeout|temporar|rate limit|try again|unavailable|econnreset|esocket|etimedout/.test(message)
}

function classifyFailure(error) {
  if (!error) return 'failed'
  const code = String(error.code || '').toUpperCase()
  const statusCode = Number(error.responseCode || error.statusCode || 0)
  const message = String(error.message || '').toLowerCase()

  // Permanent failures (non-retryable, email will never be delivered)
  if (code === 'EAUTH') return 'permanent_failure'
  if (statusCode === 550 || statusCode === 551 || statusCode === 552 || statusCode === 553) return 'permanent_failure'
  if (/no such user|user unknown|mailbox not found|invalid mailbox|does not exist|address rejected|invalid recipient/.test(message)) return 'permanent_failure'

  // Bounce-like responses
  if (statusCode >= 500 && statusCode < 600) {
    if (/bounce|undeliverable|delivery fails/.test(message)) return 'bounce'
    return 'temporary_failure'
  }

  // Rejection (server explicitly rejected)
  if (statusCode === 554 || statusCode === 421) return 'rejected'

  // Temporary failures (retryable)
  if (isRetryableError(error)) return 'temporary_failure'

  return 'failed'
}

function nextRetryAt(attempts) {
  const delay = RETRY_BASE_MS * (2 ** Math.max(0, attempts - 1))
  return plusMs(delay)
}

function senderLimitWindow(hourly = false) {
  const d = new Date()
  if (hourly) d.setMinutes(0, 0, 0)
  else d.setHours(0, 0, 0, 0)
  return toDbDate(d)
}

function senderUsage(senderId) {
  const daySince = senderLimitWindow(false)
  const hourSince = senderLimitWindow(true)
  const sentToday = db.prepare(
    `SELECT COUNT(*) c FROM emails
     WHERE sender_account_id = ? AND status = 'sent' AND sent_at >= ?`
  ).get(senderId, daySince).c
  const sentHour = db.prepare(
    `SELECT COUNT(*) c FROM emails
     WHERE sender_account_id = ? AND status = 'sent' AND sent_at >= ?`
  ).get(senderId, hourSince).c
  return { sentToday, sentHour, daySince, hourSince }
}

function markQueue(queueId, patch) {
  const keys = Object.keys(patch)
  const sets = keys.map((k) => `${k} = ?`).join(', ')
  db.prepare(`UPDATE email_queue SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map((k) => patch[k]), queueId)
}

function markEmail(emailId, patch) {
  const keys = Object.keys(patch)
  const sets = keys.map((k) => `${k} = ?`).join(', ')
  db.prepare(`UPDATE emails SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map((k) => patch[k]), emailId)
}

function maybeCompleteCampaign(campaignId) {
  const outstanding = db.prepare(
    `SELECT COUNT(*) c FROM email_queue q
     JOIN campaigns c ON c.id = q.campaign_id
     WHERE q.campaign_id = ? AND q.status IN ('pending', 'processing', 'retry') AND c.run_status = 'running'`
  ).get(campaignId).c
  if (outstanding > 0) return false
  const campaign = campaignRow(campaignId)
  if (campaign.run_status !== 'running') return false
  db.prepare(
    `UPDATE campaigns SET run_status = 'completed', status = 'completed', completed_at = datetime('now'), last_processed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(campaignId)
  recordActivity('campaign_completed', campaign.name, `Campaign completed · ${getCampaignProgress(campaignId).sent} emails sent`)
  return true
}

export function getCampaignProgress(campaignId) {
  const row = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN status = 'retry' THEN 1 ELSE 0 END) AS retry,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
     FROM email_queue WHERE campaign_id = ?`
  ).get(campaignId)
  const total = row.total || 0
  const sent = row.sent || 0
  const pending = row.pending || 0
  const processing = row.processing || 0
  const retry = row.retry || 0
  const failed = row.failed || 0
  const cancelled = row.cancelled || 0
  return {
    total,
    pending,
    processing,
    sent,
    failed,
    retry,
    cancelled,
    progress: total ? Math.round((sent / total) * 100) : 0,
  }
}

export function enqueueCampaignRecipients(campaignId, options = {}) {
  const campaign = campaignRow(campaignId)
  const template = getTemplate(campaign.template_id)
  const sender = senderForCampaign(campaign)
  if (!sender.enabled) throw badRequest('Selected sender account is disabled')

  const dueLeadRows = db.prepare(
    `SELECT cr.id AS campaign_recipient_id, cr.lead_id, l.company, l.contact, l.email,
            l.status AS lead_status, cr.status AS recipient_status
     FROM campaign_recipients cr
     JOIN leads l ON l.id = cr.lead_id
     LEFT JOIN email_queue q ON q.campaign_recipient_id = cr.id
     WHERE cr.campaign_id = ? AND cr.status = 'pending' AND q.id IS NULL
     ORDER BY cr.id`
  ).all(campaignId)

  let queued = 0
  let skipped = 0
  const startAt = options.startAt ? new Date(options.startAt) : new Date()
  const delaySeconds = Number(campaign.delay_seconds || 0)

  for (let i = 0; i < dueLeadRows.length; i++) {
    const lead = dueLeadRows[i]
    const email = normalizeEmail(lead.email)
    const scheduledAt = toDbDate(new Date(startAt.getTime() + ((queued + skipped) * delaySeconds * 1000)))
    const subjectBody = renderLeadTemplate(template, lead)

    if (!VALID_EMAIL.test(email)) {
      const tid = generateTrackingId()
      db.prepare(
        `UPDATE campaign_recipients SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?`
      ).run('Invalid email address', lead.campaign_recipient_id)
      db.prepare(
        `INSERT INTO emails (campaign_id, recipient_id, lead_id, template_id, sender_account_id, from_email, to_email, subject, body, status, error, scheduled_at, tracking_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(campaignId, lead.campaign_recipient_id, lead.lead_id, template.id, sender.id, sender.email, email, '', '', 'Invalid email address', scheduledAt, tid)
      continue
    }

    if (subjectBody.unresolved) {
      const tid = generateTrackingId()
      db.prepare(
        `UPDATE campaign_recipients SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?`
      ).run('Template contains unresolved variables', lead.campaign_recipient_id)
      db.prepare(
        `INSERT INTO emails (campaign_id, recipient_id, lead_id, template_id, sender_account_id, from_email, to_email, subject, body, status, error, scheduled_at, tracking_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(campaignId, lead.campaign_recipient_id, lead.lead_id, template.id, sender.id, sender.email, email, subjectBody.subject, subjectBody.body, 'Template contains unresolved variables', scheduledAt, tid)
      continue
    }

    const trackingId = generateTrackingId()
    const emailId = db.prepare(
      `INSERT INTO emails (campaign_id, recipient_id, lead_id, template_id, sender_account_id, from_email, to_email, subject, body, status, attempts, scheduled_at, tracking_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, datetime('now'), datetime('now'))`
    ).run(
      campaignId,
      lead.campaign_recipient_id,
      lead.lead_id,
      template.id,
      sender.id,
      sender.email,
      email,
      subjectBody.subject,
      subjectBody.body,
      scheduledAt,
      trackingId,
    ).lastInsertRowid

    db.prepare(
      `INSERT INTO email_queue
       (email_id, campaign_id, campaign_recipient_id, lead_id, recipient_email, sender_account_id, template_id, subject, body, scheduled_at, status, attempts, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, datetime('now'), datetime('now'))`
    ).run(
      emailId,
      campaignId,
      lead.campaign_recipient_id,
      lead.lead_id,
      email,
      sender.id,
      template.id,
      subjectBody.subject,
      subjectBody.body,
      scheduledAt,
    )
    db.prepare(`UPDATE campaign_recipients SET queued_at = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(scheduledAt, lead.campaign_recipient_id)
    queued++
  }

  db.prepare(`UPDATE campaigns SET last_enqueued_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(campaignId)
  return { queued, skipped, progress: getCampaignProgress(campaignId) }
}

export function startCampaign(campaignId, input = {}) {
  return transaction(() => {
    const campaign = campaignRow(campaignId)
    const current = String(campaign.run_status || campaign.status || '').toLowerCase()
    if (current === 'cancelled') throw badRequest('Cannot start cancelled campaign')
    if (current === 'completed') throw badRequest('Cannot start completed campaign')
    if (current === 'running' || current === 'active') {
      const progress = getCampaignProgress(campaignId)
      return { campaign: campaignRow(campaignId), queued: 0, skipped: 0, progress, idempotent: true }
    }
    if (current !== 'draft' && current !== 'paused') {
      throw badRequest(`Cannot start campaign in ${current} state — only draft can be started`)
    }
    const senderAccountId = input.senderAccountId ?? campaign.sender_account_id ?? getDefaultSenderRecord().id
    const sender = getSenderRecord(senderAccountId)
    if (!sender.enabled) throw badRequest('Selected sender account is disabled')
    db.prepare(
      `UPDATE campaigns
       SET sender_account_id = ?, run_status = 'running', status = 'active',
           started_at = COALESCE(started_at, datetime('now')), paused_at = NULL, cancelled_at = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(sender.id, campaignId)
    const enqueued = enqueueCampaignRecipients(campaignId, { startAt: input.startAt })
    return { campaign: campaignRow(campaignId), ...enqueued }
  })
}

export function pauseCampaign(campaignId) {
  return transaction(() => {
    const campaign = campaignRow(campaignId)
    const current = String(campaign.run_status || campaign.status || '').toLowerCase()
    if (current === 'paused') {
      return { campaign: campaignRow(campaignId), progress: getCampaignProgress(campaignId), idempotent: true }
    }
    if (current !== 'running' && current !== 'active') {
      throw badRequest(`Cannot pause campaign in ${current} state — only running can be paused`)
    }
    db.prepare(
      `UPDATE campaigns SET run_status = 'paused', status = 'paused', paused_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(campaignId)
    return { campaign: campaignRow(campaignId), progress: getCampaignProgress(campaignId) }
  })
}

export function resumeCampaign(campaignId, input = {}) {
  return transaction(() => {
    const campaign = campaignRow(campaignId)
    const current = String(campaign.run_status || campaign.status || '').toLowerCase()
    if (current === 'running' || current === 'active') {
      return { campaign: campaignRow(campaignId), progress: getCampaignProgress(campaignId), idempotent: true, queued: 0 }
    }
    if (current !== 'paused') {
      throw badRequest(`Cannot resume campaign in ${current} state — only paused can be resumed`)
    }
    const senderAccountId = input.senderAccountId ?? campaign.sender_account_id ?? getDefaultSenderRecord().id
    const sender = getSenderRecord(senderAccountId)
    if (!sender.enabled) throw badRequest('Selected sender account is disabled')
    db.prepare(
      `UPDATE campaigns SET sender_account_id = ?, run_status = 'running', status = 'active', paused_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(sender.id, campaignId)
    const enqueued = enqueueCampaignRecipients(campaignId, { startAt: input.startAt })
    return { campaign: campaignRow(campaignId), ...enqueued }
  })
}

export function cancelCampaign(campaignId) {
  return transaction(() => {
    const campaign = campaignRow(campaignId)
    const current = String(campaign.run_status || campaign.status || '').toLowerCase()
    if (current === 'cancelled') {
      return { campaign: campaignRow(campaignId), progress: getCampaignProgress(campaignId), idempotent: true }
    }
    if (current === 'completed') {
      throw badRequest('Cannot cancel completed campaign')
    }
    db.prepare(
      `UPDATE campaigns SET run_status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(campaignId)
    db.prepare(
      `UPDATE email_queue SET status = 'cancelled', updated_at = datetime('now') WHERE campaign_id = ? AND status IN ('pending', 'processing', 'retry')`
    ).run(campaignId)
    db.prepare(
      `UPDATE emails SET status = 'cancelled', updated_at = datetime('now') WHERE campaign_id = ? AND status IN ('queued', 'sending')`
    ).run(campaignId)
    db.prepare(
      `UPDATE campaign_recipients SET status = 'cancelled', updated_at = datetime('now') WHERE campaign_id = ? AND status IN ('pending')`
    ).run(campaignId)
    return { campaign: campaignRow(campaignId), progress: getCampaignProgress(campaignId) }
  })
}

function queueCandidateRows(limit) {
  const now = nowSql()
  return db.prepare(
    `SELECT q.*, c.run_status, c.scheduled_at AS campaign_scheduled_at, c.name AS campaign_name, c.delay_seconds, c.daily_limit, c.sender_account_id,
            l.company, l.contact, l.email, l.status AS lead_status,
            s.name AS sender_name, s.email AS sender_email, s.smtp_host, s.smtp_port, s.username,
            s.password_secret, s.security_mode, s.daily_limit AS sender_daily_limit, s.hourly_limit AS sender_hourly_limit, s.enabled AS sender_enabled,
            t.subject AS template_subject, t.body AS template_body
     FROM email_queue q
     JOIN campaigns c ON c.id = q.campaign_id
     JOIN leads l ON l.id = q.lead_id
     JOIN sender_accounts s ON s.id = q.sender_account_id
     JOIN templates t ON t.id = q.template_id
     WHERE q.status IN ('pending', 'retry')
       AND q.scheduled_at <= ?
       AND c.run_status = 'running'
       AND (c.scheduled_at IS NULL OR c.scheduled_at <= ?)
     ORDER BY q.scheduled_at ASC, q.id ASC
     LIMIT ?`
  ).all(now, now, limit)
}

function markRecipientStatus(queueRow, status, error = null, sentAt = null) {
  db.prepare(`UPDATE campaign_recipients SET status = ?, error = ?, sent_at = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, error, sentAt, queueRow.campaign_recipient_id)
}

function markLeadContacted(queueRow, sentAt) {
  db.prepare(
    `UPDATE leads
     SET status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
         last_campaign_id = ?,
         last_template = ?,
         last_subject = ?,
         last_email_sent_at = ?,
         campaign_count = campaign_count + 1,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(queueRow.campaign_id, queueRow.template_id, queueRow.subject, sentAt, queueRow.lead_id)
}

function processQueueRow(queueRow, options = {}) {
  const now = options.now || nowSql()
  if (queueRow.run_status !== 'running') {
    markQueue(queueRow.id, { status: queueRow.run_status === 'cancelled' ? 'cancelled' : 'pending', error: queueRow.run_status === 'cancelled' ? 'Campaign cancelled' : queueRow.error })
    return { status: queueRow.run_status }
  }
  // Defense-in-depth: campaign-level scheduled_at must be due (NULL or <= now)
  if (queueRow.campaign_scheduled_at) {
    const scheduledAt = new Date(String(queueRow.campaign_scheduled_at).replace(' ', 'T'))
    const nowDate = new Date(now.replace(' ', 'T'))
    if (!isNaN(scheduledAt.getTime()) && scheduledAt > nowDate) {
      // Not yet due — keep as pending, do not send
      return { status: 'pending', reason: 'campaign_scheduled_at_future' }
    }
  }

  const email = normalizeEmail(queueRow.email)
  if (!VALID_EMAIL.test(email)) {
    const error = 'Invalid email address'
    markQueue(queueRow.id, { status: 'failed', error, last_attempt_at: now, attempts: queueRow.attempts + 1 })
    markEmail(queueRow.email_id, { status: 'failed', error, attempts: queueRow.attempts + 1, last_attempt_at: now, sent_at: null })
    markRecipientStatus(queueRow, 'failed', error, null)
    recordActivity('email_sent', queueRow.company, `Email prevented: ${error}`)
    return { status: 'failed' }
  }

  const blocked = db.prepare(`SELECT id FROM blocked_contacts WHERE normalized_email = ?`).get(email)
  if (blocked || queueRow.lead_status === 'blocked') {
    const error = 'Blocked contact'
    markQueue(queueRow.id, { status: 'cancelled', error, last_attempt_at: now, attempts: queueRow.attempts + 1 })
    markEmail(queueRow.email_id, { status: 'cancelled', error, attempts: queueRow.attempts + 1, last_attempt_at: now })
    markRecipientStatus(queueRow, 'cancelled', error, null)
    recordActivity('contact_blocked', queueRow.company, `Campaign send skipped: ${email} blocked`)
    return { status: 'cancelled' }
  }

  const duplicate = db.prepare(
    `SELECT id FROM email_queue
     WHERE campaign_id = ? AND lead_id = ? AND id != ? AND status IN ('processing', 'sent', 'pending', 'retry')`
  ).get(queueRow.campaign_id, queueRow.lead_id, queueRow.id)
  if (duplicate) {
    const error = 'Duplicate recipient already queued for this campaign'
    markQueue(queueRow.id, { status: 'cancelled', error, last_attempt_at: now, attempts: queueRow.attempts + 1 })
    markEmail(queueRow.email_id, { status: 'cancelled', error, attempts: queueRow.attempts + 1, last_attempt_at: now })
    markRecipientStatus(queueRow, 'cancelled', error, null)
    return { status: 'cancelled' }
  }

  const senderUsageStats = senderUsage(queueRow.sender_account_id)
  if (!queueRow.sender_enabled) {
    const error = 'Sender account disabled'
    const next = nextRetryAt(queueRow.attempts + 1)
    markQueue(queueRow.id, { status: 'retry', error, attempts: queueRow.attempts + 1, last_attempt_at: now, scheduled_at: next })
    markEmail(queueRow.email_id, { status: 'queued', error, attempts: queueRow.attempts + 1, last_attempt_at: now, scheduled_at: next })
    return { status: 'retry' }
  }
  if (senderUsageStats.sentToday >= queueRow.sender_daily_limit) {
    const error = 'Daily sender limit reached'
    const retryAt = toDbDate(new Date(new Date().setHours(23, 59, 59, 0)))
    markQueue(queueRow.id, { status: 'retry', error, attempts: queueRow.attempts + 1, last_attempt_at: now, scheduled_at: retryAt })
    markEmail(queueRow.email_id, { status: 'queued', error, attempts: queueRow.attempts + 1, last_attempt_at: now, scheduled_at: retryAt })
    return { status: 'retry' }
  }
  if (senderUsageStats.sentHour >= queueRow.sender_hourly_limit) {
    const error = 'Hourly sender limit reached'
    const retryAt = toDbDate(new Date(new Date().setMinutes(59, 59, 0)))
    markQueue(queueRow.id, { status: 'retry', error, attempts: queueRow.attempts + 1, last_attempt_at: now, scheduled_at: retryAt })
    markEmail(queueRow.email_id, { status: 'queued', error, attempts: queueRow.attempts + 1, last_attempt_at: now, scheduled_at: retryAt })
    return { status: 'retry' }
  }

  const provider = providerForSender({
    email: queueRow.sender_email,
    name: queueRow.sender_name,
    smtp_host: queueRow.smtp_host,
    smtp_port: queueRow.smtp_port,
    username: queueRow.username,
    password_secret: queueRow.password_secret,
    security_mode: queueRow.security_mode,
    daily_limit: queueRow.sender_daily_limit,
    hourly_limit: queueRow.sender_hourly_limit,
    enabled: !!queueRow.sender_enabled,
  }, options)

  markQueue(queueRow.id, { status: 'processing', last_attempt_at: now, attempts: queueRow.attempts + 1 })
  markEmail(queueRow.email_id, { status: 'sending', attempts: queueRow.attempts + 1, last_attempt_at: now })

  // Record processing event
  db.prepare(
    `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, occurred_at) VALUES (?, ?, ?, 'processing', ?, ?)`
  ).run(queueRow.email_id, queueRow.campaign_id, queueRow.lead_id, JSON.stringify({ attempt: queueRow.attempts + 1 }), now)

  return provider.sendEmail({
    fromName: queueRow.sender_name,
    to: queueRow.email,
    subject: queueRow.subject,
    html: queueRow.body,
    text: queueRow.body,
  }).then((result) => {
    if (!result.ok) {
      throw result.error || new Error('SMTP send failed')
    }
    const sentAt = nowSql()
    markQueue(queueRow.id, { status: 'sent', error: null, sent_at: sentAt, provider_message_id: result.messageId || null })
    markEmail(queueRow.email_id, {
      status: 'sent',
      error: null,
      provider_message_id: result.messageId || null,
      sent_at: sentAt,
    })
    markRecipientStatus(queueRow, 'sent', null, sentAt)
    db.prepare(
      `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, provider_message_id, occurred_at) VALUES (?, ?, ?, 'sent', ?, ?, ?)`
    ).run(queueRow.email_id, queueRow.campaign_id, queueRow.lead_id, JSON.stringify({ providerMessageId: result.messageId || null, accepted: result.accepted, rejected: result.rejected }), result.messageId || null, sentAt)
    // Check if provider reports rejections
    if (result.rejected && result.rejected.length > 0) {
      db.prepare(
        `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, occurred_at) VALUES (?, ?, ?, 'rejected', ?, ?)`
      ).run(queueRow.email_id, queueRow.campaign_id, queueRow.lead_id, JSON.stringify({ rejected: result.rejected }), sentAt)
    }
    markLeadContacted(queueRow, sentAt)
    recordActivity('email_sent', queueRow.company, `Email sent to ${queueRow.email}`)
    db.prepare(`UPDATE campaigns SET last_processed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(queueRow.campaign_id)
    maybeCompleteCampaign(queueRow.campaign_id)
    return { status: 'sent', messageId: result.messageId || null }
  }).catch((error) => {
    const retryable = isRetryableError(error)
    const attempts = (queueRow.attempts || 0) + 1
    const nextStatus = retryable && attempts < MAX_ATTEMPTS ? 'retry' : 'failed'
    const nextAt = retryable && attempts < MAX_ATTEMPTS ? nextRetryAt(attempts) : null
    // Classify failure type from provider response
    const eventType = classifyFailure(error)
    markQueue(queueRow.id, {
      status: nextStatus,
      error: error.message || 'SMTP send failed',
      attempts,
      last_attempt_at: now,
      scheduled_at: nextAt || queueRow.scheduled_at,
    })
    markEmail(queueRow.email_id, {
      status: nextStatus === 'retry' ? 'queued' : 'failed',
      error: error.message || 'SMTP send failed',
      attempts,
      last_attempt_at: now,
      scheduled_at: nextAt || queueRow.scheduled_at,
    })
    markRecipientStatus(queueRow, nextStatus === 'retry' ? 'pending' : 'failed', error.message || 'SMTP send failed', null)
    db.prepare(
      `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, occurred_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(queueRow.email_id, queueRow.campaign_id, queueRow.lead_id, eventType, JSON.stringify({ error: error.message || 'SMTP send failed', code: error.code, responseCode: error.responseCode, temporary: retryable }), now)
    recordActivity('email_failed', queueRow.company, `Email failed for ${queueRow.email}: ${error.message || 'SMTP send failed'}`)
    if (!retryable || attempts >= MAX_ATTEMPTS) {
      maybeCompleteCampaign(queueRow.campaign_id)
    }
    return { status: nextStatus, error }
  })
}

export async function processQueueTick(options = {}) {
  const limit = options.limit ?? 5
  const rows = queueCandidateRows(limit)
  if (!rows.length) return { processed: 0, results: [] }
  const results = []
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await processQueueRow(row, options))
  }
  return { processed: results.length, results }
}

export function getCampaignRunSummary(campaignId) {
  const campaign = campaignRow(campaignId)
  const progress = getCampaignProgress(campaignId)
  const dailyLimit = Number(campaign.daily_limit || 200)
  // Use sender-specific todaySent if sender exists, otherwise 0
  let todaySent = 0
  try {
    const senderId = campaign.sender_account_id || getDefaultSenderRecord().id
    const usage = senderUsage(senderId)
    todaySent = usage.sentToday
  } catch {
    todaySent = 0
  }
  const remainingToday = Math.max(0, dailyLimit - todaySent)
  const percentComplete = progress.total ? Math.round((progress.sent / progress.total) * 100) : 0
  return {
    campaignId: campaign.id,
    id: campaign.id,
    name: campaign.name,
    status: campaign.run_status,
    runStatus: campaign.run_status,
    legacyStatus: campaign.status,
    senderAccountId: campaign.sender_account_id,
    senderName: campaign.sender_name,
    senderEmail: campaign.sender_email,
    progress,
    dailyLimit,
    todaySent,
    remainingToday,
    percentComplete,
    startedAt: campaign.started_at ? fmtDateTime(campaign.started_at) : null,
    pausedAt: campaign.paused_at ? fmtDateTime(campaign.paused_at) : null,
    cancelledAt: campaign.cancelled_at ? fmtDateTime(campaign.cancelled_at) : null,
  }
}

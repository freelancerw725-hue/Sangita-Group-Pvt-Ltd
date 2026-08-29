import { db, transaction } from '../db/connection.js'
import { badRequest, badGateway, conflict, notFound } from '../lib/errors.js'
import { normalizeEmail } from '../lib/normalize.js'
import { logger } from '../lib/logger.js'
import { SMTPEmailProvider } from '../providers/smtp-provider.js'
import { fmtDateTime } from '../lib/format.js'

function validateLimits(dailyLimit, hourlyLimit) {
  if (dailyLimit < hourlyLimit) {
    throw badRequest('Daily limit must be greater than or equal to hourly limit')
  }
}

function rowToSender(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    username: row.username,
    securityMode: row.security_mode,
    dailyLimit: row.daily_limit,
    hourlyLimit: row.hourly_limit,
    enabled: !!row.enabled,
    lastTestedAt: row.last_tested_at ? fmtDateTime(row.last_tested_at) : null,
    lastTestStatus: row.last_test_status || null,
    lastTestError: row.last_test_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function senderRow(id) {
  const row = db.prepare(
    `SELECT id, name, email, smtp_host, smtp_port, username, password_secret,
            security_mode, daily_limit, hourly_limit, enabled,
            last_tested_at, last_test_status, last_test_error, created_at, updated_at
     FROM sender_accounts WHERE id = ?`
  ).get(id)
  if (!row) throw notFound('Sender account not found')
  return row
}

export function getSenderRecord(id) {
  return senderRow(id)
}

export function getDefaultSenderRecord(preferredId = null) {
  if (preferredId) return senderRow(preferredId)
  const providerSetting = db.prepare(
    `SELECT default_sender_account_id FROM email_provider_settings WHERE enabled = 1 ORDER BY id DESC LIMIT 1`
  ).get()
  if (providerSetting?.default_sender_account_id) return senderRow(providerSetting.default_sender_account_id)
  const firstEnabled = db.prepare(
    `SELECT id FROM sender_accounts WHERE enabled = 1 ORDER BY id LIMIT 1`
  ).get()
  if (firstEnabled) return senderRow(firstEnabled.id)
  throw notFound('No enabled sender account found')
}

export function listEnabledSenderIds() {
  return db.prepare(`SELECT id FROM sender_accounts WHERE enabled = 1 ORDER BY id`).all().map((r) => r.id)
}

function senderProvider(id, options = {}) {
  const sender = senderRow(id)
  if (!sender.password_secret && !options.allowEmptyPassword) {
    throw badRequest('Sender account is missing SMTP credentials')
  }
  return new SMTPEmailProvider(sender, options)
}

export function listSenders() {
  return db.prepare(
    `SELECT id, name, email, smtp_host, smtp_port, username, security_mode, daily_limit,
            hourly_limit, enabled, last_tested_at, last_test_status, last_test_error,
            created_at, updated_at
     FROM sender_accounts ORDER BY id DESC`
  ).all().map(rowToSender)
}

export function getSender(id) {
  return rowToSender(senderRow(id))
}

export function createSender(input) {
  return transaction(() => {
    const email = normalizeEmail(input.email)
    const existing = db.prepare(`SELECT id FROM sender_accounts WHERE email = ?`).get(email)
    if (existing) throw conflict('Sender email already exists', { field: 'email' })
    validateLimits(input.dailyLimit, input.hourlyLimit)
    const id = db.prepare(
      `INSERT INTO sender_accounts
       (name, email, smtp_host, smtp_port, username, password_secret, security_mode, daily_limit, hourly_limit, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.name,
      email,
      input.smtpHost,
      input.smtpPort,
      input.username,
      input.password,
      input.securityMode,
      input.dailyLimit,
      input.hourlyLimit,
      input.enabled ? 1 : 0,
    ).lastInsertRowid
    return getSender(id)
  })
}

export function updateSender(id, input) {
  return transaction(() => {
    const existing = senderRow(id)
    const nextEmail = input.email ? normalizeEmail(input.email) : existing.email
    if (nextEmail !== existing.email) {
      const dupe = db.prepare(`SELECT id FROM sender_accounts WHERE email = ? AND id != ?`).get(nextEmail, id)
      if (dupe) throw conflict('Sender email already exists', { field: 'email' })
    }
    const next = {
      name: input.name ?? existing.name,
      email: nextEmail,
      smtpHost: input.smtpHost ?? existing.smtp_host,
      smtpPort: input.smtpPort ?? existing.smtp_port,
      username: input.username ?? existing.username,
      password: input.password ?? existing.password_secret,
      securityMode: input.securityMode ?? existing.security_mode,
      dailyLimit: input.dailyLimit ?? existing.daily_limit,
      hourlyLimit: input.hourlyLimit ?? existing.hourly_limit,
      enabled: typeof input.enabled === 'boolean' ? input.enabled : !!existing.enabled,
    }
    validateLimits(next.dailyLimit, next.hourlyLimit)
    db.prepare(
      `UPDATE sender_accounts
       SET name = ?, email = ?, smtp_host = ?, smtp_port = ?, username = ?, password_secret = ?,
           security_mode = ?, daily_limit = ?, hourly_limit = ?, enabled = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      next.name,
      next.email,
      next.smtpHost,
      next.smtpPort,
      next.username,
      next.password,
      next.securityMode,
      next.dailyLimit,
      next.hourlyLimit,
      next.enabled ? 1 : 0,
      id,
    )
    return getSender(id)
  })
}

export function setSenderEnabled(id, enabled) {
  const row = senderRow(id)
  db.prepare(
    `UPDATE sender_accounts SET enabled = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(enabled ? 1 : 0, id)
  logger.info(`sender ${enabled ? 'enabled' : 'disabled'}: ${row.email}`)
  return getSender(id)
}

export function deleteSender(id) {
  const row = senderRow(id)
  const res = db.prepare(`DELETE FROM sender_accounts WHERE id = ?`).run(id)
  if (res.changes === 0) throw notFound('Sender account not found')
  logger.info(`sender deleted: ${row.email}`)
  return { deleted: res.changes }
}

export async function testSenderConnection(id, options = {}) {
  const sender = senderRow(id)
  const provider = senderProvider(id, options)
  logger.info(`SMTP connection test started: ${sender.email}`)
  try {
    const result = await provider.verifyConnection()
    db.prepare(
      `UPDATE sender_accounts
       SET last_tested_at = datetime('now'), last_test_status = 'success', last_test_error = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(id)
    logger.info(`SMTP connection test success: ${sender.email}`)
    return { ok: true, sender: getSender(id), result }
  } catch (error) {
    db.prepare(
      `UPDATE sender_accounts
       SET last_tested_at = datetime('now'), last_test_status = 'failed', last_test_error = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(error.message || 'SMTP connection test failed', id)
    logger.warn(`SMTP connection test failed: ${sender.email}`, { message: error.message, code: error.code })
    throw error
  }
}

export async function sendTestEmail(id, input, options = {}) {
  const sender = senderRow(id)
  if (!sender.enabled && !options.allowDisabled) {
    throw badRequest('Sender account is disabled')
  }
  const recipient = normalizeEmail(input.recipient)
  if (!recipient) throw badRequest('Recipient is required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw badRequest('Invalid recipient email')
  const provider = senderProvider(id, options)
  logger.info(`SMTP test email started: ${sender.email} -> ${recipient}`)
  const attemptAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const emailId = db.prepare(
    `INSERT INTO emails
     (sender_account_id, from_email, to_email, subject, body, status, attempts, last_attempt_at, scheduled_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', 1, ?, ?, ?, ?)`
  ).run(
    id,
    sender.email,
    recipient,
    input.subject,
    input.body,
    attemptAt,
    attemptAt,
    attemptAt,
    attemptAt,
  ).lastInsertRowid

  try {
    const result = await provider.sendEmail({
      fromName: sender.name,
      to: recipient,
      subject: input.subject,
      text: input.body,
      html: input.body,
    })
    if (!result.ok) {
      throw badGateway('SMTP test email failed', result.error)
    }
    db.prepare(
      `UPDATE emails
       SET status = 'sent', provider_message_id = ?, sent_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(result.messageId || null, attemptAt, emailId)
    db.prepare(`INSERT INTO email_events (email_id, type, meta, occurred_at) VALUES (?, 'sent', ?, ?)`)
      .run(emailId, JSON.stringify({ testEmail: true, providerMessageId: result.messageId || null }), attemptAt)
    logger.info(`SMTP test email success: ${sender.email} -> ${recipient}`)
    return { ok: true, emailId, messageId: result.messageId || null }
  } catch (error) {
    db.prepare(
      `UPDATE emails
       SET status = 'failed', error = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(error.message || 'SMTP test email failed', emailId)
    db.prepare(`INSERT INTO email_events (email_id, type, meta, occurred_at) VALUES (?, 'failed', ?, ?)`)
      .run(emailId, JSON.stringify({ testEmail: true, error: error.message || 'SMTP test email failed' }), attemptAt)
    logger.error(`SMTP test email failed: ${sender.email} -> ${recipient}`, { message: error.message, code: error.code })
    throw error
  }
}

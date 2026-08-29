import crypto from 'node:crypto'
import { db } from '../db/connection.js'
import { nowSql } from '../lib/format.js'

/**
 * Tracking service for open and click tracking.
 * Uses HMAC-signed tokens to prevent tampering.
 * No open redirect vulnerabilities.
 */

const TOKEN_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

function getSecret() {
  const row = db.prepare(`SELECT secret FROM tracking_keys WHERE enabled = 1 ORDER BY id DESC LIMIT 1`).get()
  return row ? row.secret : null
}

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 32)
}

/**
 * Generate a signed tracking token for an email.
 * Format: base64(emailId:trackingId:hmac)
 */
export function generateTrackingToken(emailId, trackingId) {
  const secret = getSecret()
  if (!secret) throw new Error('No tracking key configured')
  const payload = `${emailId}:${trackingId}`
  const signature = hmac(secret, payload)
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url')
  return token
}

/**
 * Verify and decode a tracking token. Returns { emailId, trackingId } or null.
 */
export function verifyTrackingToken(token) {
  try {
    const secret = getSecret()
    if (!secret) return null

    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return null

    const [emailIdStr, trackingId, signature] = parts
    const emailId = Number(emailIdStr)
    if (!emailId || !trackingId) return null

    const expectedSig = hmac(secret, `${emailId}:${trackingId}`)
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null

    return { emailId, trackingId }
  } catch {
    return null
  }
}

/**
 * Generate an open tracking pixel URL.
 * Returns a 1x1 transparent GIF URL that records the open event.
 */
export function getTrackingPixelUrl(appUrl, token) {
  return `${appUrl}/api/tracking/open/${token}.gif`
}

/**
 * Generate a click tracking redirect URL.
 */
export function getClickTrackingUrl(appUrl, token, targetUrl) {
  const encoded = Buffer.from(targetUrl).toString('base64url')
  return `${appUrl}/api/tracking/click/${token}?url=${encoded}`
}

/**
 * Record an open event for an email. Returns true if recorded, false if duplicate.
 */
export function recordOpen(emailId, { ipAddress, userAgent } = {}) {
  const email = db.prepare(`SELECT id, campaign_id, lead_id FROM emails WHERE id = ?`).get(emailId)
  if (!email) return false

  // Check for existing open
  const existing = db.prepare(
    `SELECT id FROM email_events WHERE email_id = ? AND type = 'open' LIMIT 1`
  ).get(emailId)
  if (existing) return false

  const timestamp = nowSql()

  db.prepare(
    `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, ip_address, user_agent, occurred_at)
     VALUES (?, ?, ?, 'open', ?, ?, ?, ?)`
  ).run(
    emailId, email.campaign_id, email.lead_id,
    JSON.stringify({ source: 'pixel' }),
    ipAddress || null, userAgent || null, timestamp,
  )

  // Update email opened_at if not set
  db.prepare(`UPDATE emails SET opened_at = ? WHERE id = ? AND opened_at IS NULL`).run(timestamp, emailId)

  return true
}

/**
 * Record a click event for an email. Returns true if recorded.
 */
export function recordClick(emailId, targetUrl, { ipAddress, userAgent } = {}) {
  const email = db.prepare(`SELECT id, campaign_id, lead_id FROM emails WHERE id = ?`).get(emailId)
  if (!email) return false

  // Block open redirects: only allow http/https URLs, no javascript: or data: schemes
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) return false

  // Block internal/admin redirects
  try {
    const parsed = new URL(targetUrl)
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') return false
  } catch {
    return false
  }

  const timestamp = nowSql()

  // Record the click event
  db.prepare(
    `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, ip_address, user_agent, occurred_at)
     VALUES (?, ?, ?, 'click', ?, ?, ?, ?)`
  ).run(
    emailId, email.campaign_id, email.lead_id,
    JSON.stringify({ targetUrl }),
    ipAddress || null, userAgent || null, timestamp,
  )

  // Record in email_clicks table
  db.prepare(
    `INSERT INTO email_clicks (email_id, campaign_id, lead_id, target_url, ip_address, user_agent, clicked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    emailId, email.campaign_id, email.lead_id,
    targetUrl, ipAddress || null, userAgent || null, timestamp,
  )

  // Update email clicked_at if not set
  db.prepare(`UPDATE emails SET clicked_at = ? WHERE id = ? AND clicked_at IS NULL`).run(timestamp, emailId)

  return true
}

/**
 * Verify a tracking token and return the associated email record.
 */
export function resolveTrackingToken(token) {
  const decoded = verifyTrackingToken(token)
  if (!decoded) return null

  const email = db.prepare(
    `SELECT e.*, c.name AS campaign_name
     FROM emails e
     LEFT JOIN campaigns c ON c.id = e.campaign_id
     WHERE e.id = ? AND e.tracking_id = ?`
  ).get(decoded.emailId, decoded.trackingId)

  return email || null
}

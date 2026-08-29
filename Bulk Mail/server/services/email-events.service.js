import { db } from '../db/connection.js'
import { nowSql } from '../lib/format.js'

/**
 * Core event recording service.
 * Every email lifecycle event goes through here.
 * Never creates fake events — only records what actually happens.
 */

const VALID_EVENT_TYPES = new Set([
  'queued', 'processing', 'sent', 'delivered', 'open', 'click',
  'bounce', 'failed', 'blocked_prevented', 'rejected', 'replied',
  'temporary_failure', 'permanent_failure',
])

/**
 * Record a single email event. Idempotent for 'open' events on the same email
 * (won't create duplicate open events for the same email_id).
 */
export function recordEvent({
  emailId,
  campaignId = null,
  leadId = null,
  type,
  meta = null,
  providerMessageId = null,
  ipAddress = null,
  userAgent = null,
  occurredAt = null,
}) {
  if (!emailId) throw new Error('emailId is required')
  if (!type || !VALID_EVENT_TYPES.has(type)) throw new Error(`Invalid event type: ${type}`)

  const timestamp = occurredAt || nowSql()

  // Deduplicate open events: only one open per email
  if (type === 'open') {
    const existing = db.prepare(
      `SELECT id FROM email_events WHERE email_id = ? AND type = 'open' LIMIT 1`
    ).get(emailId)
    if (existing) return { id: existing.id, duplicate: true }
  }

  // Deduplicate click events: same email + same URL = deduplicate within 60 seconds
  if (type === 'click' && meta) {
    const targetUrl = typeof meta === 'object' ? meta.targetUrl : null
    if (targetUrl) {
      const recent = db.prepare(
        `SELECT id FROM email_events
         WHERE email_id = ? AND type = 'click'
           AND json_extract(meta, '$.targetUrl') = ?
           AND occurred_at > datetime(?, '-60 seconds')
         LIMIT 1`
      ).get(emailId, targetUrl, timestamp)
      if (recent) return { id: recent.id, duplicate: true }
    }
  }

  const result = db.prepare(
    `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, provider_message_id, ip_address, user_agent, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    emailId,
    campaignId,
    leadId,
    type,
    meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null,
    providerMessageId,
    ipAddress,
    userAgent,
    timestamp,
  )

  return { id: result.lastInsertRowid, duplicate: false }
}

/**
 * Record a batch of events in a single transaction.
 */
export function recordEvents(events) {
  const results = []
  const stmt = db.prepare(
    `INSERT INTO email_events (email_id, campaign_id, lead_id, type, meta, provider_message_id, ip_address, user_agent, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  db.exec('BEGIN')
  try {
    for (const evt of events) {
      if (!evt.emailId || !evt.type || !VALID_EVENT_TYPES.has(evt.type)) {
        results.push({ error: `Invalid event: emailId=${evt.emailId} type=${evt.type}` })
        continue
      }
      const timestamp = evt.occurredAt || nowSql()
      const r = stmt.run(
        evt.emailId, evt.campaignId || null, evt.leadId || null, evt.type,
        evt.meta ? (typeof evt.meta === 'string' ? evt.meta : JSON.stringify(evt.meta)) : null,
        evt.providerMessageId || null, evt.ipAddress || null, evt.userAgent || null, timestamp,
      )
      results.push({ id: r.lastInsertRowid })
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return results
}

/**
 * Get all events for a specific email.
 */
export function getEventsByEmailId(emailId) {
  return db.prepare(
    `SELECT * FROM email_events WHERE email_id = ? ORDER BY occurred_at ASC`
  ).all(emailId)
}

/**
 * Get all events for a campaign.
 */
export function getEventsByCampaignId(campaignId) {
  return db.prepare(
    `SELECT * FROM email_events WHERE campaign_id = ? ORDER BY occurred_at ASC`
  ).all(campaignId)
}

/**
 * Get event counts grouped by type for a campaign.
 */
export function getEventCountsByCampaign(campaignId) {
  const rows = db.prepare(
    `SELECT type, COUNT(*) AS count FROM email_events WHERE campaign_id = ? GROUP BY type`
  ).all(campaignId)
  const counts = {}
  for (const row of rows) counts[row.type] = row.count
  return counts
}

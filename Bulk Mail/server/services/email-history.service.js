import { db } from '../db/connection.js'
import { fmtDateTime, fmtDateHuman } from '../lib/format.js'

/**
 * Complete sent email history.
 * Every sent email is permanently traceable with full metadata.
 */

/**
 * List all sent emails with full details, filterable by campaign, lead, date range.
 */
export function listSentEmails({ campaignId, leadId, status, from, to, page = 1, pageSize = 50 } = {}) {
  let where = []
  let params = []

  if (campaignId) { where.push('e.campaign_id = ?'); params.push(campaignId) }
  if (leadId) { where.push('e.lead_id = ?'); params.push(leadId) }
  if (status) { where.push('e.status = ?'); params.push(status) }
  if (from) { where.push('e.sent_at >= ?'); params.push(from) }
  if (to) { where.push('e.sent_at <= ?'); params.push(to) }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const offset = (page - 1) * pageSize

  const total = db.prepare(
    `SELECT COUNT(*) c FROM emails e ${whereClause}`
  ).get(...params).c

  const rows = db.prepare(
    `SELECT
       e.id, e.campaign_id, e.lead_id, e.template_id, e.sender_account_id,
       e.from_email, e.to_email, e.subject, e.body, e.status, e.error,
       e.provider_message_id, e.attempts, e.last_attempt_at,
       e.scheduled_at, e.sent_at, e.delivered_at, e.opened_at, e.clicked_at, e.replied_at,
       e.tracking_id, e.created_at, e.updated_at,
       c.name AS campaign_name,
       t.name AS template_name,
       s.name AS sender_name, s.email AS sender_email,
       l.company AS lead_company, l.contact AS lead_contact
     FROM emails e
     LEFT JOIN campaigns c ON c.id = e.campaign_id
     LEFT JOIN templates t ON t.id = e.template_id
     LEFT JOIN sender_accounts s ON s.id = e.sender_account_id
     LEFT JOIN leads l ON l.id = e.lead_id
     ${whereClause}
     ORDER BY e.sent_at DESC NULLS LAST, e.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset)

  return {
    data: rows.map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      campaignName: r.campaign_name,
      leadId: r.lead_id,
      leadCompany: r.lead_company,
      leadContact: r.lead_contact,
      templateId: r.template_id,
      templateName: r.template_name,
      senderAccountId: r.sender_account_id,
      senderName: r.sender_name,
      senderEmail: r.sender_email,
      fromEmail: r.from_email,
      toEmail: r.to_email,
      subject: r.subject,
      status: r.status,
      providerMessageId: r.provider_message_id,
      attempts: r.attempts,
      failureReason: r.error,
      scheduledAt: r.scheduled_at ? fmtDateTime(r.scheduled_at) : null,
      sentAt: r.sent_at ? fmtDateTime(r.sent_at) : null,
      deliveredAt: r.delivered_at ? fmtDateTime(r.delivered_at) : null,
      openedAt: r.opened_at ? fmtDateTime(r.opened_at) : null,
      clickedAt: r.clicked_at ? fmtDateTime(r.clicked_at) : null,
      repliedAt: r.replied_at ? fmtDateTime(r.replied_at) : null,
      trackingId: r.tracking_id,
      createdAt: fmtDateTime(r.created_at),
    })),
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Get complete email history for a specific lead.
 */
export function getLeadEmailHistory(leadId) {
  const rows = db.prepare(
    `SELECT
       e.id, e.campaign_id, e.subject, e.status, e.sent_at,
       e.opened_at, e.clicked_at, e.replied_at, e.tracking_id,
       c.name AS campaign_name, t.name AS template_name
     FROM emails e
     LEFT JOIN campaigns c ON c.id = e.campaign_id
     LEFT JOIN templates t ON t.id = e.template_id
     WHERE e.lead_id = ? AND e.status IN ('sent', 'delivered', 'failed', 'bounced')
     ORDER BY e.sent_at DESC NULLS LAST, e.created_at DESC`
  ).all(leadId)

  return rows.map((r) => ({
    emailId: r.id,
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    templateName: r.template_name,
    subject: r.subject,
    sentAt: r.sent_at ? fmtDateTime(r.sent_at) : null,
    status: r.status,
    opened: !!r.opened_at,
    clicked: !!r.clicked_at,
    replied: !!r.replied_at,
    trackingId: r.tracking_id,
  }))
}

/**
 * Get a single email by tracking_id (for tracking endpoints).
 */
export function getEmailByTrackingId(trackingId) {
  return db.prepare(
    `SELECT e.*, c.name AS campaign_name, l.company AS lead_company
     FROM emails e
     LEFT JOIN campaigns c ON c.id = e.campaign_id
     LEFT JOIN leads l ON l.id = e.lead_id
     WHERE e.tracking_id = ?`
  ).get(trackingId)
}

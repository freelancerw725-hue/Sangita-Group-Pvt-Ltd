import { db, transaction } from '../db/connection.js'
import { notFound, badRequest } from '../lib/errors.js'
import { fmtDateHuman } from '../lib/format.js'
import { assertTemplateExists } from './templates.service.js'
import { recordActivity } from './activities.service.js'
import { normalizeEmail } from '../lib/normalize.js'
import { getCampaignProgress } from './campaign-execution.service.js'

function resolveRecipients(audience) {
  let leads = []
  let duplicatesRemoved = 0
  if (audience.type === 'batch') {
    if (!audience.batchId) throw badRequest('audience.batchId is required for batch audiences')
    leads = db.prepare(`SELECT id, company, contact, email, NULL AS website, NULL AS category, NULL AS location FROM leads WHERE batch_id = ?`).all(audience.batchId)
  } else if (audience.type === 'all') {
    leads = db.prepare(`SELECT id, company, contact, email, NULL AS website, NULL AS category, NULL AS location FROM leads`).all()
  } else {
    if (!audience.leadIds?.length) throw badRequest('audience.leadIds is required for manual audiences')
    const uniqueLeadIds = [...new Set(audience.leadIds)]
    duplicatesRemoved += audience.leadIds.length - uniqueLeadIds.length
    const placeholders = uniqueLeadIds.map(() => '?').join(',')
    leads = db.prepare(`SELECT id, company, contact, email, NULL AS website, NULL AS category, NULL AS location FROM leads WHERE id IN (${placeholders})`).all(...uniqueLeadIds)
  }
  const unique = new Map()
  let excludedBlocked = 0
  let excludedInvalid = 0

  for (const lead of leads) {
    const email = normalizeEmail(lead.email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      excludedInvalid++
      continue
    }
    if (unique.has(email)) {
      duplicatesRemoved++
      continue
    }
    unique.set(email, { ...lead, email })
  }

  const blocked = new Set(
    db.prepare(`SELECT email FROM blocked_contacts`).all().map((r) => normalizeEmail(r.email))
  )
  const blockedLeadIds = new Set(
    db.prepare(`SELECT id FROM leads WHERE status = 'blocked'`).all().map((r) => r.id)
  )
  const recipients = [...unique.values()].filter((l) => !blocked.has(normalizeEmail(l.email)) && !blockedLeadIds.has(l.id))
  excludedBlocked = unique.size - recipients.length
  return { recipients, excludedBlocked, excludedInvalid, duplicatesRemoved }
}

function campaignRow(userTenantId, id) {
  const tenantWhere = userTenantId ? ` AND c.tenant_id = ${userTenantId}` : ''
  const row = db.prepare(
    `SELECT c.*, t.name AS template_name, b.name AS batch_name, s.name AS sender_name, s.email AS sender_email
     FROM campaigns c
     LEFT JOIN templates t ON t.id = c.template_id
     LEFT JOIN lead_batches b ON b.id = c.audience_ref
     LEFT JOIN sender_accounts s ON s.id = c.sender_account_id
     WHERE c.id = ?${tenantWhere}`
  ).get(id)
  if (!row) throw new Error('Campaign not found')
  return row
}

function toUi(userTenantId, row) {
  const progress = getCampaignProgress(row.id)
  const audienceLabel = row.audience_type === 'batch' && row.batch_name
    ? `Batch · ${row.batch_name}`
    : row.audience_type === 'all' ? 'All leads' : 'Manual audience'

  // Get real engagement stats from email_events with tenant filtering
  const tenantWhere = userTenantId ? ` AND tenant_id = ${userTenantId}` : ''
  const emailsSent = db.prepare(`SELECT COUNT(*) c FROM emails WHERE campaign_id = ?${tenantWhere} AND status = 'sent'`).get(row.id).c
  const opened = db.prepare(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE campaign_id = ?${tenantWhere} AND type = 'open'`).get(row.id).c
  const clicked = db.prepare(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE campaign_id = ?${tenantWhere} AND type = 'click'`).get(row.id).c
  const repliedCount = db.prepare(`SELECT COUNT(*) c FROM replies WHERE campaign_id = ?`).get(row.id).c
  const interestedCount = db.prepare(
    `SELECT COUNT(DISTINCT cr.lead_id) c FROM campaign_recipients cr JOIN leads l ON l.id = cr.lead_id WHERE cr.campaign_id = ? AND l.status = 'interested'${tenantWhere}`
  ).get(row.id).c

  return {
    id: row.id,
    name: row.name,
    status: (row.run_status || row.status || 'draft').charAt(0).toUpperCase() + (row.run_status || row.status || 'draft').slice(1),
    created: fmtDateHuman(row.created_at),
    template: row.template_name || 'selected template',
    audience: audienceLabel,
    audienceType: row.audience_type,
    audienceRef: row.audience_ref,
    templateId: row.template_id,
    senderAccountId: row.sender_account_id,
    senderName: row.sender_name || null,
    senderEmail: row.sender_email || null,
    dailyLimit: row.daily_limit,
    delaySeconds: row.delay_seconds,
    sent: emailsSent,
    opened,
    clicked,
    replied: repliedCount,
    failed: progress.failed,
    totalRecipients: progress.total,
    queued: progress.pending + progress.retry,
    pending: progress.pending,
    processing: progress.processing,
    retry: progress.retry,
    cancelled: progress.cancelled,
    deliveredPct: progress.progress,
    interested: interestedCount,
    note: row.run_status === 'running' ? 'Sending in progress' : 'Ready when you are',
  }
}

export function listCampaigns(userTenantId) {
  const ids = db.prepare(`SELECT id FROM campaigns ORDER BY id`).all().map((r) => r.id)
  return ids.map((id) => toUi(userTenantId, campaignRow(userTenantId, id)))
}

export function getCampaign(userTenantId, id) {
  return toUi(userTenantId, campaignRow(userTenantId, id))
}

export function getCampaignStats() {
  const queue = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ('pending', 'retry') THEN 1 ELSE 0 END) AS queued,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
     FROM email_queue`
  ).get()
  const emailsSent = queue.sent || 0
  const opens = db.prepare(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'open'`).get().c
  const clicks = db.prepare(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'click'`).get().c
  const replies = db.prepare(`SELECT COUNT(*) c FROM replies`).get().c
  const bounced = db.prepare(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'bounce'`).get().c
  const failed = db.prepare(`SELECT COUNT(*) c FROM emails WHERE status = 'failed'`).get().c
  return {
    total: db.prepare(`SELECT COUNT(*) c FROM campaigns`).get().c,
    queued: queue.queued || 0,
    pending: queue.pending || 0,
    processing: queue.processing || 0,
    failed,
    bounced,
    emailsSent,
    deliveryProgress: queue.total ? Math.round((emailsSent / queue.total) * 100) + '%' : '0%',
    openRate: emailsSent ? Math.round((opens / emailsSent) * 100) + '%' : '—',
    clickRate: emailsSent ? Math.round((clicks / emailsSent) * 100) + '%' : '—',
    replyRate: emailsSent ? Math.round((replies / emailsSent) * 100) + '%' : '—',
  }
}

export function createCampaign(input) {
  assertTemplateExists(input.templateId)
  const { recipients, excludedBlocked, excludedInvalid, duplicatesRemoved } = resolveRecipients(input.audience)
  if (recipients.length === 0) throw badRequest('No eligible recipients (all selected leads are blocked or missing)')

  const runStatus = normalizeCampaignRunStatus(input.status)
  const legacyStatus = normalizeLegacyCampaignStatus(runStatus)

  return transaction(() => {
    const id = db.prepare(
      `INSERT INTO campaigns (name, status, run_status, template_id, sender_account_id, audience_type, audience_ref, daily_limit, delay_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.name, legacyStatus, runStatus, input.templateId, input.senderAccountId ?? null, input.audience.type,
      input.audience.type === 'batch' ? input.audience.batchId ?? null : null,
      input.dailyLimit, input.delaySeconds
    ).lastInsertRowid

    const ins = db.prepare(`INSERT INTO campaign_recipients (campaign_id, lead_id, status) VALUES (?, ?, 'pending')`)
    for (const r of recipients) ins.run(id, r.id)

    recordActivity('lead_created', input.name, `Campaign created: ${input.name} (${recipients.length} recipients)`)
    return { campaign: getCampaign(undefined, id), excludedBlocked, excludedInvalid, duplicatesRemoved }
  })
}

export function updateCampaign(id, input) {
  assertTemplateExists(input.templateId)
  const existing = campaignRow(id)

  return transaction(() => {
    let excludedBlocked = 0
    let excludedInvalid = 0
    let duplicatesRemoved = 0
    const next = { ...existing, ...input }
    const nextRunStatus = input.status ? normalizeCampaignRunStatus(input.status) : existing.run_status || normalizeCampaignRunStatus(existing.status)
    const nextLegacyStatus = normalizeLegacyCampaignStatus(nextRunStatus)
    db.prepare(
      `UPDATE campaigns SET name = ?, status = ?, run_status = ?, template_id = ?, sender_account_id = ?, daily_limit = ?, delay_seconds = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(next.name, nextLegacyStatus, nextRunStatus, next.template_id, input.senderAccountId ?? existing.sender_account_id ?? null, next.daily_limit, next.delay_seconds, id)

    if (input.audience) {
      const { recipients, excludedBlocked: excluded, excludedInvalid: invalid, duplicatesRemoved: dupes } = resolveRecipients(input.audience)
      excludedBlocked = excluded
      excludedInvalid = invalid
      duplicatesRemoved = dupes
      db.prepare(`DELETE FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'`).run(id)
      const ins = db.prepare(`INSERT INTO campaign_recipients (campaign_id, lead_id, status) VALUES (?, ?, 'pending')`)
      const existingSent = new Set(
        db.prepare(`SELECT lead_id FROM campaign_recipients WHERE campaign_id = ? AND status = 'sent'`).all(id).map((r) => r.lead_id)
      )
      for (const r of recipients) {
        if (!existingSent.has(r.id)) ins.run(id, r.id)
      }
      db.prepare(
        `UPDATE campaigns SET audience_type = ?, audience_ref = ? WHERE id = ?`
      ).run(input.audience.type, input.audience.type === 'batch' ? input.audience.batchId ?? null : null, id)
    }
    return { campaign: getCampaign(id), excludedBlocked, excludedInvalid, duplicatesRemoved }
  })
}

export function setCampaignStatus(id, status) {
  return transaction(() => {
    const existing = campaignRow(id)
    const runStatus = normalizeCampaignRunStatus(status)
    const legacyStatus = normalizeLegacyCampaignStatus(runStatus)
    const completedAt = runStatus === 'completed' && existing.run_status !== 'completed' ? datetimeNow() : existing.completed_at
    db.prepare(`UPDATE campaigns SET status = ?, run_status = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(legacyStatus, runStatus, completedAt, id)
    if (runStatus === 'completed' && existing.run_status !== 'completed') {
      const sent = db.prepare(`SELECT COUNT(*) c FROM campaign_recipients WHERE campaign_id = ? AND status = 'sent'`).get(id).c
      recordActivity('campaign_completed', existing.name, `Campaign completed · ${sent} emails sent`)
    }
    return getCampaign(id)
  })
}

export function deleteCampaign(id) {
  const res = db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(id)
  if (res.changes === 0) throw notFound('Campaign not found')
  return { deleted: res.changes }
}

export function listRecipients(id) {
  campaignRow(id)
  return db.prepare(
    `SELECT cr.id, cr.lead_id, cr.status, cr.sent_at, l.company, l.email, l.batch_id, b.name AS batch
     FROM campaign_recipients cr
     JOIN leads l ON l.id = cr.lead_id
     LEFT JOIN lead_batches b ON b.id = l.batch_id
     WHERE cr.campaign_id = ?
     ORDER BY cr.id`
  ).all(id)
}

export function replaceRecipients(id, leadIds) {
  campaignRow(id)
  const { recipients, excludedBlocked } = resolveRecipients({ type: 'manual', leadIds })

  return transaction(() => {
    db.prepare(`DELETE FROM campaign_recipients WHERE campaign_id = ? AND status IN ('pending', 'cancelled')`).run(id)
    const existing = new Set(
      db.prepare(`SELECT lead_id FROM campaign_recipients WHERE campaign_id = ?`).all(id).map((r) => r.lead_id)
    )
    const ins = db.prepare(`INSERT INTO campaign_recipients (campaign_id, lead_id, status) VALUES (?, ?, 'pending')`)
    let added = 0
    for (const r of recipients) {
      if (!existing.has(r.id)) {
        ins.run(id, r.id)
        added++
      }
    }
    return { added, excludedBlocked, recipients: listRecipients(id).length }
  })
}

function datetimeNow() {
  return nowSql()
}

function normalizeCampaignRunStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'running') return 'running'
  if (s === 'paused') return 'paused'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'completed') return 'completed'
  return 'draft'
}

function normalizeLegacyCampaignStatus(runStatus) {
  const s = normalizeCampaignRunStatus(runStatus)
  if (s === 'running') return 'active'
  if (s === 'cancelled') return 'active'
  return s
}

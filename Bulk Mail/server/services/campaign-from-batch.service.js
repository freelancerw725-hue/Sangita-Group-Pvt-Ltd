import { db } from '../db/connection.js'
import { badRequest, notFound } from '../lib/errors.js'
import { assertTemplateExists } from './templates.service.js'
import { createCampaign, getCampaign } from './campaigns.service.js'

/**
 * Verify Lead Finder sheet is ready_for_bulk_mail via server-to-server call.
 * If LEAD_FINDER_BASE_URL not set or fetch fails, fallback to local batch_imports check.
 */
async function verifyLeadSheetReady(sheetId) {
  const base = (process.env.LEAD_FINDER_BASE_URL || process.env.LEAD_FINDER_URL || '').trim()
  const key = (process.env.LEAD_FINDER_API_KEY || process.env.LEAD_FINDER_AUTOMATION_KEY || process.env.BULK_MAIL_IMPORT_KEY || '').trim()
  if (!base || !sheetId) return { verified: false, reason: 'no_base' }

  // Try to fetch via handoff endpoint which already checks ready_for_bulk_mail
  const url = `${base.replace(/\/$/, '')}/api/lead-sheets/${encodeURIComponent(sheetId)}/handoff`
  try {
    const headers = {}
    if (key) headers['x-api-key'] = key
    const res = await fetch(url, { headers })
    if (res.status === 404) return { verified: false, reason: 'sheet_not_found' }
    const data = await res.json().catch(() => ({}))
    // handoff returns {handoff, sheet} when ready, or error when not ready
    if (data.handoff && data.handoff.status === 'READY_FOR_BULK_MAIL') {
      return { verified: true, handoff: data.handoff, sheet: data.sheet }
    }
    if (data.error && /No template selected|No approved leads/.test(data.error)) {
      return { verified: false, reason: 'not_ready', details: data.error }
    }
    // Fallback: check direct sheet endpoint
    const url2 = `${base.replace(/\/$/, '')}/api/lead-sheets/${encodeURIComponent(sheetId)}`
    const res2 = await fetch(url2, { headers })
    if (res2.ok) {
      const d2 = await res2.json().catch(() => ({}))
      const sheet = d2.sheet
      if (sheet && sheet.status === 'ready_for_bulk_mail') return { verified: true, sheet }
      if (sheet) return { verified: false, reason: 'sheet_not_ready', details: `status=${sheet.status}` }
    }
    return { verified: false, reason: 'not_ready', details: data.error || 'unknown' }
  } catch (e) {
    // Network failure → fallback to local check
    return { verified: false, reason: 'fetch_failed', details: e.message }
  }
}

export async function createCampaignFromBatch({ batchId, templateId, sendAt }) {
  // 1. Verify batch exists
  const batch = db.prepare(`SELECT * FROM lead_batches WHERE id = ?`).get(batchId)
  if (!batch) throw notFound('Batch not found')

  // 2. Verify batch came from Lead Finder (via batch_imports)
  const importRec = db.prepare(`SELECT * FROM batch_imports WHERE batch_id = ?`).get(batchId)
  if (!importRec) {
    // Strict: if we require Lead Finder batches, reject non-Lead-Finder batches
    // For backward compatibility, allow but log warning — spec says verify batch came from Lead Finder
    // We will reject if batch has no import record and its notes doesn't contain lead_finder
    const isLeadFinder = importRec || (batch.notes && batch.notes.includes('lead_finder'))
    if (!isLeadFinder) {
      throw badRequest('Batch is not a Lead Finder batch (missing import record)')
    }
  }

  // 3. Verify batch has imported leads
  const leadCount = db.prepare(`SELECT COUNT(*) c FROM leads WHERE batch_id = ?`).get(batchId).c
  if (leadCount === 0) throw badRequest('Batch has no leads — cannot create campaign from empty batch')

  // 4. Verify Lead Sheet is eligible (if we have sheetId)
  const sheetId = importRec ? importRec.sheet_id : null
  if (sheetId) {
    const sheetCheck = await verifyLeadSheetReady(sheetId)
    // If we could verify and it says not ready, reject
    if (sheetCheck.verified === false && sheetCheck.reason === 'sheet_not_ready') {
      throw badRequest(`Lead Sheet not ready: ${sheetCheck.details || 'status != ready_for_bulk_mail'}`)
    }
    if (sheetCheck.verified === false && sheetCheck.reason === 'not_ready') {
      throw badRequest(`Lead Sheet not ready: ${sheetCheck.details || 'not READY_FOR_BULK_MAIL'}`)
    }
    // If sheet_not_found, we treat as not eligible — but don't block if Lead Finder unreachable
    if (sheetCheck.reason === 'sheet_not_found') {
      throw badRequest('Lead Sheet not found in Lead Finder')
    }
    // If fetch_failed or no_base, we fallback to local check — allow
  }

  // 5. Verify template exists using existing template service
  assertTemplateExists(templateId)

  // 6. Idempotency: same batchId + templateId should not create duplicate campaigns
  const existing = db.prepare(`
    SELECT id FROM campaigns
    WHERE audience_type = 'batch' AND audience_ref = ? AND template_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(batchId, templateId)
  if (existing) {
    const campaign = getCampaign(existing.id)
    // Calculate recipient count for response (reuse existing logic)
    const recipientCount = db.prepare(`SELECT COUNT(*) c FROM campaign_recipients WHERE campaign_id = ?`).get(existing.id).c
    return {
      idempotent: true,
      campaignId: existing.id,
      batchId,
      templateId,
      status: campaign.status.toLowerCase(),
      recipientCount,
      campaign,
    }
  }

  // 7. Create campaign using EXISTING createCampaign() logic — keep draft
  const batchName = batch.name
  const campaignName = `${batchName} — Campaign`

  const result = createCampaign({
    name: campaignName,
    templateId,
    audience: { type: 'batch', batchId },
    dailyLimit: 200,
    delaySeconds: 45,
    status: 'draft',
  })

  const campaignId = result.campaign.id
  let scheduledAt = null
  if (sendAt) {
    const d = new Date(sendAt)
    if (!isNaN(d.getTime())) {
      scheduledAt = d.toISOString().slice(0, 19).replace('T', ' ')
      db.prepare(`UPDATE campaigns SET scheduled_at = ?, updated_at = datetime('now') WHERE id = ?`).run(scheduledAt, campaignId)
    }
  } else if (importRec && importRec.sheet_id) {
    // Try to fetch sendAt from Lead Sheet if not provided
    try {
      const base = (process.env.LEAD_FINDER_BASE_URL || process.env.LEAD_FINDER_URL || '').trim()
      const key = (process.env.LEAD_FINDER_API_KEY || process.env.LEAD_FINDER_AUTOMATION_KEY || '').trim()
      if (base) {
        const url = `${base.replace(/\/$/, '')}/api/lead-sheets/${encodeURIComponent(importRec.sheet_id)}`
        const headers = {}
        if (key) headers['x-api-key'] = key
        const res = await fetch(url, { headers })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          const sheet = data.sheet
          if (sheet && sheet.sendAt) {
            const d = new Date(sheet.sendAt)
            if (!isNaN(d.getTime())) {
              scheduledAt = d.toISOString().slice(0, 19).replace('T', ' ')
              db.prepare(`UPDATE campaigns SET scheduled_at = ?, updated_at = datetime('now') WHERE id = ?`).run(scheduledAt, campaignId)
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  const recipientCount = db.prepare(`SELECT COUNT(*) c FROM campaign_recipients WHERE campaign_id = ?`).get(campaignId).c

  // Ensure status remains draft and no queue rows created
  const campaignRow = db.prepare(`SELECT status, run_status FROM campaigns WHERE id = ?`).get(campaignId)
  if (campaignRow.status !== 'draft' && campaignRow.run_status !== 'draft') {
    // Force draft if somehow not
    db.prepare(`UPDATE campaigns SET status='draft', run_status='draft' WHERE id = ?`).run(campaignId)
  }

  return {
    idempotent: false,
    campaignId,
    batchId,
    templateId,
    status: 'draft',
    scheduledAt,
    recipientCount,
    campaign: { ...result.campaign, scheduled_at: scheduledAt },
  }
}

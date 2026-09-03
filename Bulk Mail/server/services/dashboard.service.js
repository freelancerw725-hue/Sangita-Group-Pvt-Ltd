import { db } from '../db/connection.js'
import { pct, fmtMoney, fmtDay, fmtDateTime, fmtDateHuman } from '../lib/format.js'

// Default page size if not specified
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

export function getDashboard(userTenantId, page, pageSize) {
  const effectivePage = page !== undefined ? Number(page) : 1
  const effectivePageSize = pageSize !== undefined ? Math.min(Number(pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const offset = (effectivePage - 1) * effectivePageSize

  // --- Stats (always global totals, unaffected by pagination) ---
  // In this single-tenant setup, all data belongs to tenant_id = 1.
  // Stats return global counts without tenant filtering.

  const totalLeads = db.prepare(
    `SELECT COUNT(*) AS c FROM leads`
  ).get().c

  const newLeads = db.prepare(
    `SELECT COUNT(*) AS c FROM leads WHERE status = 'new'`
  ).get().c

  const emailsSent = db.prepare(
    `SELECT COUNT(*) AS c FROM emails WHERE status = 'sent'`
  ).get().c

  const emailsFailed = db.prepare(
    `SELECT COUNT(*) AS c FROM emails WHERE status = 'failed'`
  ).get().c

  const emailsBounced = db.prepare(
    `SELECT COUNT(DISTINCT email_id) AS c FROM email_events WHERE type = 'bounce'`
  ).get().c

  const totalOpened = db.prepare(
    `SELECT COUNT(DISTINCT email_id) AS c FROM email_events WHERE type = 'open'`
  ).get().c

  const totalClicked = db.prepare(
    `SELECT COUNT(DISTINCT email_id) AS c FROM email_events WHERE type = 'click'`
  ).get().c

  // Delivery rate: delivered / sent * 100
  // Delivered = email_events where type = 'delivered'
  const deliveredSub = db.prepare(
    `SELECT COUNT(DISTINCT email_id) AS c FROM email_events WHERE type = 'delivered'`
  ).get().c
  const deliveryNumeral = deliveredSub !== null && deliveredSub !== undefined ? deliveredSub : 0
  const deliveryRate = emailsSent > 0 ? pct(deliveryNumeral, emailsSent) : '0%'

  // Open rate: opened / sent * 100
  const openRate = emailsSent > 0 ? pct(totalOpened, emailsSent) : '0%'

  // Click rate: clicked / sent * 100
  const clickRate = emailsSent > 0 ? pct(totalClicked, emailsSent) : '0%'

  // Bounce rate: bounced / sent * 100
  const bounceRate = emailsSent > 0 ? pct(emailsBounced, emailsSent) : '0%'

  // Active contacts: leads that are not 'never_contacted' and not 'blocked'
  const activeContacts = db.prepare(
    `SELECT COUNT(*) AS c FROM leads WHERE status != 'never_contacted' AND status != 'blocked'`
  ).get().c

  // --- Recent activity from activities table ---
  // Controlled pagination with 7-day filter, global (no tenant filter)
  const recentActivityCount = db.prepare(
    `SELECT COUNT(*) AS c FROM activities WHERE created_at >= datetime('now', '-7 days', 'localtime')`
  ).get().c

  const recentActivity = db.prepare(
    `SELECT * FROM activities WHERE created_at >= datetime('now', '-7 days', 'localtime') ORDER BY created_at DESC LIMIT ${effectivePageSize} OFFSET ${offset}`
  ).all()

  // --- Email queue (real data from email_queue table) ---
  const emailQueueCount = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue`
  ).get().c

  const emailQueue = db.prepare(
    `SELECT * FROM email_queue ORDER BY priority DESC, created_at LIMIT ${effectivePageSize} OFFSET ${offset}`
  ).all()

  // Queue counts (global totals)
  const queuePending = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'pending'`
  ).get().c

  const queueProcessing = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'processing'`
  ).get().c

  const queueSent = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'sent'`
  ).get().c

  const queueFailed = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'failed'`
  ).get().c

  const queueRetry = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'retry'`
  ).get().c

  // --- Campaign performance with backend pagination ---
  const campaignPerformanceTotal = db.prepare(
    `SELECT COUNT(*) AS c FROM campaigns`
  ).get().c

  const campaignPerformance = db.prepare(
    `SELECT 
       c.id,
       c.name,
       c.status,
       c.created_at,
       COUNT(DISTINCT cr.id) AS recipients,
       SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN ev.type = 'delivered' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN ev.type = 'bounce' THEN 1 ELSE 0 END) AS bounced,
       SUM(CASE WHEN ev.type = 'open' THEN 1 ELSE 0 END) AS opened,
       SUM(CASE WHEN ev.type = 'click' THEN 1 ELSE 0 END) AS clicked,
       SUM(CASE WHEN ev.type = 'failed' THEN 1 ELSE 0 END) AS failed
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     LEFT JOIN email_events ev ON ev.campaign_id = c.id
     GROUP BY c.id, c.name, c.status, c.created_at
     ORDER BY c.created_at DESC
     LIMIT ${effectivePageSize} OFFSET ${offset}`
  ).all()

  // Format campaign performance with percentages
  const formattedCampaigns = campaignPerformance.map((c) => {
    const totalSent = c.sent || 0
    const deliveryPct = totalSent > 0 ? pct(c.delivered, totalSent) : '0%'
    const openPct = totalSent > 0 ? pct(c.opened, totalSent) : '0%'
    const clickPct = totalSent > 0 ? pct(c.clicked, totalSent) : '0%'
    const bouncePct = totalSent > 0 ? pct(c.bounced, totalSent) : '0%'
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      created: fmtDateHuman(c.created),
      recipients: c.recipients || 0,
      sent: c.sent || 0,
      delivered: c.delivered || 0,
      bounced: c.bounced || 0,
      opened: c.opened || 0,
      clicked: c.clicked || 0,
      failed: c.failed || 0,
      deliveryPct,
      openPct,
      clickPct,
      bouncePct,
    }
  })

  // --- Batch analytics with backend pagination ---
  const batchAnalyticsTotal = db.prepare(
    `SELECT COUNT(*) AS c FROM lead_batches`
  ).get().c

  const batchAnalytics = db.prepare(
    `SELECT 
       b.name,
       COUNT(DISTINCT l.id) AS imported,
       COUNT(DISTINCT CASE WHEN e.status = 'sent' THEN e.lead_id END) AS emailed
     FROM lead_batches b
     LEFT JOIN leads l ON l.batch_id = b.id
     LEFT JOIN emails e ON e.lead_id = l.id
     GROUP BY b.id, b.name
     ORDER BY b.id
     LIMIT ${effectivePageSize} OFFSET ${offset}`
  ).all()

  // Format batch analytics
  const formattedBatches = batchAnalytics.map((b) => {
    return {
      id: b.id || b.name,
      name: b.name || '',
      imported: b.imported || 0,
      emailed: b.emailed || 0,
    }
  })

  return {
    // Pagination metadata for campaign performance
    campaignPerformance: {
      data: formattedCampaigns,
      total: campaignPerformanceTotal,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalPages: campaignPerformanceTotal > 0 ? Math.ceil(campaignPerformanceTotal / effectivePageSize) : 1,
    },
    // Pagination metadata for batch analytics
    batchAnalytics: {
      data: formattedBatches,
      total: batchAnalyticsTotal,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalPages: batchAnalyticsTotal > 0 ? Math.ceil(batchAnalyticsTotal / effectivePageSize) : 1,
    },
    // Pagination metadata for recent activity
    recentActivity: {
      data: recentActivity,
      total: recentActivityCount,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalPages: recentActivityCount > 0 ? Math.ceil(recentActivityCount / effectivePageSize) : 1,
    },
    // Email queue with pagination
    emailQueue: {
      data: emailQueue,
      total: emailQueueCount,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalPages: emailQueueCount > 0 ? Math.ceil(emailQueueCount / effectivePageSize) : 1,
    },
    // Stats remain global (unaffected by pagination)
    stats: {
      totalLeads,
      newLeads,
      emailsSent,
      emailsFailed,
      emailsBounced,
      deliveryRate,
      openRate,
      clickRate,
      bounceRate,
      activeContacts,
      totalOpened,
      totalClicked,
    },
    // Tenant ID for reference
    tenantId: userTenantId || null,
  }
}

import { db } from '../db/connection.js'
import { pct } from '../lib/format.js'

export function getCampaignAnalytics(campaignId) {
  const campaign = db.prepare(
    `SELECT c.*, t.name AS template_name FROM campaigns c LEFT JOIN templates t ON t.id = c.template_id WHERE c.id = ?`
  ).get(campaignId)
  if (!campaign) return null

  const totalRecipients = db.prepare(`SELECT COUNT(*) c FROM campaign_recipients WHERE campaign_id = ?`).get(campaignId).c

  const queue = db.prepare(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status IN ('pending','retry') THEN 1 ELSE 0 END) AS queued,
       SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
     FROM email_queue WHERE campaign_id = ?`
  ).get(campaignId)

  const events = db.prepare(`SELECT type, COUNT(*) AS count FROM email_events WHERE campaign_id = ? GROUP BY type`).all(campaignId)
  const ev = {}
  for (const r of events) ev[r.type] = r.count

  const replied = db.prepare(`SELECT COUNT(*) c FROM replies WHERE campaign_id = ?`).get(campaignId).c

  const interested = db.prepare(
    `SELECT COUNT(DISTINCT cr.lead_id) c FROM campaign_recipients cr JOIN leads l ON l.id = cr.lead_id WHERE cr.campaign_id = ? AND l.status = 'interested'`
  ).get(campaignId).c

  const emailsSent = db.prepare(`SELECT COUNT(*) c FROM emails WHERE campaign_id = ? AND status = 'sent'`).get(campaignId).c

  return {
    campaign: { id: campaign.id, name: campaign.name, status: campaign.run_status, templateName: campaign.template_name, createdAt: campaign.created_at },
    totalRecipients,
    queued: queue.queued || 0,
    processing: queue.processing || 0,
    sent: emailsSent,
    delivered: ev.delivered || 0,
    failed: queue.failed || 0,
    cancelled: queue.cancelled || 0,
    bounced: ev.bounce || 0,
    opened: ev.open || 0,
    clicked: ev.click || 0,
    replied,
    interested,
    blocked: ev.blocked_prevented || 0,
    rejected: ev.rejected || 0,
    temporaryFailure: ev.temporary_failure || 0,
    permanentFailure: ev.permanent_failure || 0,
    openRate: pct(ev.open || 0, emailsSent),
    clickRate: pct(ev.click || 0, emailsSent),
    replyRate: pct(replied, emailsSent),
    interestRate: pct(interested, emailsSent),
  }
}

export function getDailyStatistics(days = 30) {
  const q = (sql, ...p) => db.prepare(sql).all(...p)
  const daysParam = days
  return {
    emailsSent: q(`SELECT substr(sent_at,1,10) AS day, COUNT(*) AS count FROM emails WHERE status='sent' AND sent_at>=datetime('now','-'||?||' days','localtime') GROUP BY day ORDER BY day`, daysParam).map(r => ({ date: r.day, count: r.count })),
    replies: q(`SELECT substr(received_at,1,10) AS day, COUNT(*) AS count FROM replies WHERE received_at>=datetime('now','-'||?||' days','localtime') GROUP BY day ORDER BY day`, daysParam).map(r => ({ date: r.day, count: r.count })),
    opens: q(`SELECT substr(occurred_at,1,10) AS day, COUNT(DISTINCT email_id) AS count FROM email_events WHERE type='open' AND occurred_at>=datetime('now','-'||?||' days','localtime') GROUP BY day ORDER BY day`, daysParam).map(r => ({ date: r.day, count: r.count })),
    clicks: q(`SELECT substr(occurred_at,1,10) AS day, COUNT(DISTINCT email_id) AS count FROM email_events WHERE type='click' AND occurred_at>=datetime('now','-'||?||' days','localtime') GROUP BY day ORDER BY day`, daysParam).map(r => ({ date: r.day, count: r.count })),
    newLeads: q(`SELECT substr(created_at,1,10) AS day, COUNT(*) AS count FROM leads WHERE created_at>=datetime('now','-'||?||' days','localtime') GROUP BY day ORDER BY day`, daysParam).map(r => ({ date: r.day, count: r.count })),
    interestedLeads: q(`SELECT substr(updated_at,1,10) AS day, COUNT(*) AS count FROM leads WHERE status='interested' AND updated_at>=datetime('now','-'||?||' days','localtime') GROUP BY day ORDER BY day`, daysParam).map(r => ({ date: r.day, count: r.count })),
  }
}

export function getMonthlyStatistics({ year, month, from, to } = {}) {
  let dateFilter, params
  if (from && to) {
    dateFilter = 'AND e.sent_at >= ? AND e.sent_at <= ?'
    params = [from, to]
  } else {
    const y = year || new Date().getFullYear()
    const m = month || (new Date().getMonth() + 1)
    const ms = `${y}-${String(m).padStart(2, '0')}-01`
    const me = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    dateFilter = 'AND e.sent_at >= ? AND e.sent_at < ?'
    params = [ms, me]
  }
  const one = (sql, ...p) => db.prepare(sql).get(...p)
  const emailsSent = one(`SELECT COUNT(*) c FROM emails e WHERE e.status = 'sent' ${dateFilter}`, ...params).c
  const failedEmails = one(`SELECT COUNT(*) c FROM emails e WHERE e.status = 'failed' ${dateFilter}`, ...params).c
  const replies = one(`SELECT COUNT(*) c FROM replies WHERE received_at >= ? AND received_at <= ?`, params[0], params[1]).c
  const interestedLeads = one(`SELECT COUNT(*) c FROM leads WHERE status = 'interested' AND updated_at >= ? AND updated_at <= ?`, params[0], params[1]).c
  const totalCampaigns = one(`SELECT COUNT(*) c FROM campaigns WHERE created_at >= ? AND created_at <= ?`, params[0], params[1]).c
  const leadsAdded = one(`SELECT COUNT(*) c FROM leads WHERE created_at >= ? AND created_at <= ?`, params[0], params[1]).c
  const opens = one(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'open' AND occurred_at >= ? AND occurred_at <= ?`, params[0], params[1]).c
  const clicks = one(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'click' AND occurred_at >= ? AND occurred_at <= ?`, params[0], params[1]).c
  return {
    period: { year: year || null, month: month || null, from: from || null, to: to || null },
    emailsSent, failedEmails, replies, replyRate: pct(replies, emailsSent),
    interestedLeads, totalCampaigns, leadsAdded,
    opened: opens, clicked: clicks,
    openRate: pct(opens, emailsSent), clickRate: pct(clicks, emailsSent),
  }
}

export function getDashboardAnalytics() {
  const one = (sql) => db.prepare(sql).get()
  const totalLeads = one(`SELECT COUNT(*) c FROM leads`).c
  const newLeads = one(`SELECT COUNT(*) c FROM leads WHERE status = 'new'`).c
  const emailsSent = one(`SELECT COUNT(*) c FROM emails WHERE status = 'sent'`).c
  const emailsFailed = one(`SELECT COUNT(*) c FROM emails WHERE status = 'failed'`).c
  const emailsBounced = one(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'bounce'`).c
  const replies = one(`SELECT COUNT(*) c FROM replies`).c
  const interested = one(`SELECT COUNT(*) c FROM leads WHERE status = 'interested'`).c
  const won = one(`SELECT COUNT(*) c FROM opportunities WHERE status = 'won'`).c
  const revenue = one(`SELECT COALESCE(SUM(value), 0) v FROM opportunities WHERE status = 'won'`).v
  const followupsPending = one(`SELECT COUNT(*) c FROM followups WHERE status IN ('scheduled', 'overdue')`).c
  const todaysImports = one(`SELECT COUNT(*) c FROM leads WHERE date(created_at) = date('now', 'localtime')`).c
  const neverContacted = one(`SELECT COUNT(*) c FROM leads WHERE status = 'never_contacted'`).c
  const blockedContacts = one(`SELECT COUNT(*) c FROM blocked_contacts`).c
  const emailsPrevented = one(`SELECT COUNT(*) c FROM email_events WHERE type = 'blocked_prevented'`).c
  const totalOpened = one(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'open'`).c
  const totalClicked = one(`SELECT COUNT(DISTINCT email_id) c FROM email_events WHERE type = 'click'`).c

  const emailsSentChart = db.prepare(
    `SELECT substr(sent_at,1,10) AS d, COUNT(*) AS count FROM emails WHERE status='sent' AND sent_at>=datetime('now','-30 days','localtime') GROUP BY d ORDER BY d`
  ).all().map(r => ({ date: r.d, count: r.count }))

  const newLeadsChart = db.prepare(
    `SELECT substr(created_at,1,10) AS d, COUNT(*) AS count FROM leads WHERE created_at>=datetime('now','-30 days','localtime') GROUP BY d ORDER BY d`
  ).all().map(r => ({ date: r.d, count: r.count }))

  const batchAnalytics = db.prepare(
    `SELECT b.name, COUNT(DISTINCT l.id) AS imported, COUNT(DISTINCT CASE WHEN e.status='sent' THEN e.lead_id END) AS emailed FROM lead_batches b LEFT JOIN leads l ON l.batch_id=b.id LEFT JOIN emails e ON e.lead_id=l.id GROUP BY b.id ORDER BY b.id`
  ).all()

  const campaignAnalytics = db.prepare(
    `SELECT c.name, SUM(CASE WHEN cr.status='sent' THEN 1 ELSE 0 END) AS sent, COUNT(cr.id) AS total FROM campaigns c LEFT JOIN campaign_recipients cr ON cr.campaign_id=c.id GROUP BY c.id ORDER BY c.id`
  ).all().map(r => ({ name: r.name, sent: `${r.sent}/${r.total} sent` }))

  const fmtMoney = (n) => '\u20b9' + Number(n || 0).toLocaleString('en-IN')

  return {
    stats: {
      totalLeads, newLeads, emailsSent, emailsFailed, emailsBounced,
      totalOpened, totalClicked, replies,
      replyRate: pct(replies, emailsSent),
      interested, wonDeals: won, revenue: fmtMoney(revenue),
      followupsPending, conversion: pct(won, totalLeads),
      todaysImports, neverContacted, blockedContacts, emailsPrevented,
    },
    emailsSentChart, newLeadsChart, batchAnalytics, campaignAnalytics,
  }
}

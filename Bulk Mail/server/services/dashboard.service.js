import { db } from '../db/connection.js'
import { pct, fmtMoney, fmtDay, fmtDateTime } from '../lib/format.js'
import { listRecent } from './activities.service.js'

export function getDashboard() {
  const one = (sql, ...params) => db.prepare(sql).get(...params)

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

  // Charts — last 30 days, only days that have data (matches the UI's sparse style)
  const emailsSentChart = db.prepare(
    `SELECT substr(sent_at, 1, 10) AS d, COUNT(*) AS count
     FROM emails
     WHERE status = 'sent' AND sent_at >= datetime('now', '-30 days', 'localtime')
     GROUP BY d ORDER BY d`
  ).all().map((r) => ({ date: r.d, count: r.count }))

  const newLeadsChart = db.prepare(
    `SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS count
     FROM leads
     WHERE created_at >= datetime('now', '-30 days', 'localtime')
     GROUP BY d ORDER BY d`
  ).all().map((r) => ({ date: r.d, count: r.count }))

  const batchAnalytics = db.prepare(
    `SELECT b.name,
            COUNT(DISTINCT l.id) AS imported,
            COUNT(DISTINCT CASE WHEN e.status = 'sent' THEN e.lead_id END) AS emailed
     FROM lead_batches b
     LEFT JOIN leads l ON l.batch_id = b.id
     LEFT JOIN emails e ON e.lead_id = l.id
     GROUP BY b.id
     ORDER BY b.id`
  ).all()

  const campaignAnalytics = db.prepare(
    `SELECT c.name,
            SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) AS sent,
            COUNT(cr.id) AS total
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     GROUP BY c.id
     ORDER BY c.id`
  ).all().map((r) => ({ name: r.name, sent: `${r.sent}/${r.total} sent` }))

  return {
    stats: {
      totalLeads,
      newLeads,
      emailsSent,
      emailsFailed,
      emailsBounced,
      totalOpened,
      totalClicked,
      replies,
      replyRate: pct(replies, emailsSent),
      interested,
      wonDeals: won,
      revenue: fmtMoney(revenue),
      followupsPending,
      conversion: pct(won, totalLeads),
      todaysImports,
      neverContacted,
      blockedContacts,
      emailsPrevented,
    },
    emailsSentChart,
    newLeadsChart,
    batchAnalytics,
    campaignAnalytics,
    recentActivity: listRecent(6),
  }
}

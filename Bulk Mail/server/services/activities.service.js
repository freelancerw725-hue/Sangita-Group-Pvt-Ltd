import { db } from '../db/connection.js'
import { fmtDateTime } from '../lib/format.js'

const DOT_COLORS = {
  contact_blocked: '#ef4444',
  sync_imported: '#10b981',
  deal_won: '#22c55e',
  lead_created: '#8b5cf6',
  lead_imported: '#8b5cf6',
  email_sent: '#3b82f6',
  email_failed: '#ef4444',
  campaign_completed: '#3b82f6',
  reply_received: '#3b82f6',
}

export function recordActivity(type, company, message, when = null) {
  db.prepare(`INSERT INTO activities (type, company, message, created_at) VALUES (?, ?, ?, ?)`)
    .run(type, company ?? null, message, when ?? new Date().toISOString().slice(0, 19).replace('T', ' '))
}

export function listRecent(limit = 6) {
  const rows = db.prepare(`SELECT * FROM activities ORDER BY created_at DESC, id DESC LIMIT ?`).all(limit)
  return rows.map((a) => ({
    company: a.company || 'System',
    text: a.message,
    time: fmtDateTime(a.created_at),
    dot: a.type === 'reply_received' && /interested/i.test(a.message) ? '#22c55e' : (DOT_COLORS[a.type] || '#3b82f6'),
  }))
}

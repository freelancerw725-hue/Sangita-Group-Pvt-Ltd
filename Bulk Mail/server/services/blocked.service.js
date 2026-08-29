import { db, transaction } from '../db/connection.js'
import { conflict, notFound } from '../lib/errors.js'
import { fmtDateTime } from '../lib/format.js'
import { recordActivity } from './activities.service.js'
import { normalizeEmail } from '../lib/normalize.js'

export function toUi(row) {
  return {
    id: row.id,
    email: row.email,
    company: row.company || '—',
    reason: row.reason,
    date: fmtDateTime(row.created_at),
    blockedBy: row.blocked_by_name || 'admin',
    notes: row.notes || '',
  }
}

export function listBlocked() {
  return db.prepare(
    `SELECT bc.*, u.name AS blocked_by_name
     FROM blocked_contacts bc
     LEFT JOIN users u ON u.id = bc.blocked_by
     ORDER BY bc.id DESC`
  ).all().map(toUi)
}

export function blockContact(input, userId = null) {
  return transaction(() => {
    const email = normalizeEmail(input.email)
    const existing = db.prepare(`SELECT id FROM blocked_contacts WHERE normalized_email = ?`).get(email)
    if (existing) throw conflict(`${input.email} is already blocked`)

    const id = db.prepare(
      `INSERT INTO blocked_contacts (email, company, reason, notes, blocked_by) VALUES (?, ?, ?, ?, ?)`
    ).run(email, input.company, input.reason, input.notes, userId).lastInsertRowid

    // Keep lead status in sync so filters/UI reflect the suppression
    db.prepare(`UPDATE leads SET status = 'blocked', normalized_email = LOWER(TRIM(email)), updated_at = datetime('now') WHERE normalized_email = ? AND status != 'blocked'`)
      .run(email)

    recordActivity('contact_blocked', input.company || email, `Contact blocked: ${email}`)
    return db.prepare(`SELECT bc.*, u.name AS blocked_by_name FROM blocked_contacts bc LEFT JOIN users u ON u.id = bc.blocked_by WHERE bc.id = ?`).get(id)
  })
}

export function unblockContact(id) {
  return transaction(() => {
    const row = db.prepare(`SELECT * FROM blocked_contacts WHERE id = ?`).get(id)
    if (!row) throw notFound('Blocked contact not found')
    db.prepare(`DELETE FROM blocked_contacts WHERE id = ?`).run(id)
    db.prepare(`UPDATE leads SET status = 'new', updated_at = datetime('now') WHERE normalized_email = ? AND status = 'blocked'`)
      .run(normalizeEmail(row.email))
    return { unblocked: row.email }
  })
}

/** Emails that must never be mailed. Used by campaigns/queue/import. */
export function blockedEmailSet() {
  return new Set(db.prepare(`SELECT email FROM blocked_contacts`).all().map((r) => normalizeEmail(r.email)))
}

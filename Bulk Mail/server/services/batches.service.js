import { db, transaction } from '../db/connection.js'
import { conflict, notFound } from '../lib/errors.js'
import { fmtDateHuman } from '../lib/format.js'

function toUi(row) {
  const imported = row.imported || 0
  const emailed = row.emailed || 0
  const status = imported === 0 ? 'empty' : emailed > 0 ? 'active' : 'ready'
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    imported,
    emailed,
    created: fmtDateHuman(row.created_at),
    status,
  }
}

export function listBatches() {
  return db.prepare(
    `SELECT b.*,
            (SELECT COUNT(DISTINCT l.id) FROM leads l WHERE l.batch_id = b.id) AS imported,
            (SELECT COUNT(DISTINCT e.lead_id) FROM emails e JOIN leads l ON l.id = e.lead_id
              WHERE l.batch_id = b.id AND e.status = 'sent') AS emailed
     FROM lead_batches b
     ORDER BY b.id`
  ).all().map(toUi)
}

export function createBatch(input) {
  const existing = db.prepare(`SELECT id FROM lead_batches WHERE name = ?`).get(input.name)
  if (existing) throw conflict(`Batch "${input.name}" already exists`)
  const id = db.prepare(
    `INSERT INTO lead_batches (name, source, status, notes) VALUES (?, ?, 'ready', ?)`
  ).run(input.name, input.source, input.notes).lastInsertRowid
  return getBatch(id)
}

export function updateBatch(id, input) {
  return transaction(() => {
    const existing = db.prepare(`SELECT * FROM lead_batches WHERE id = ?`).get(id)
    if (!existing) throw notFound('Batch not found')
    if (input.name && input.name !== existing.name) {
      const dupe = db.prepare(`SELECT id FROM lead_batches WHERE name = ?`).get(input.name)
      if (dupe) throw conflict(`Batch "${input.name}" already exists`)
    }
    const next = { ...existing, ...input }
    db.prepare(`UPDATE lead_batches SET name = ?, source = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(next.name, next.source, next.notes, id)
    return getBatch(id)
  })
}

export function getBatch(id) {
  const row = db.prepare(
    `SELECT b.*,
            (SELECT COUNT(DISTINCT l.id) FROM leads l WHERE l.batch_id = b.id) AS imported,
            (SELECT COUNT(DISTINCT e.lead_id) FROM emails e JOIN leads l ON l.id = e.lead_id
              WHERE l.batch_id = b.id AND e.status = 'sent') AS emailed
     FROM lead_batches b WHERE b.id = ?`
  ).get(id)
  if (!row) throw notFound('Batch not found')
  return toUi(row)
}

export function deleteBatch(id) {
  // leads.batch_id is ON DELETE SET NULL — leads survive, batch is removed
  const res = db.prepare(`DELETE FROM lead_batches WHERE id = ?`).run(id)
  if (res.changes === 0) throw notFound('Batch not found')
  return { deleted: res.changes }
}

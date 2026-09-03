import { db } from '../db/connection.js'
import { nowSql } from '../lib/format.js'

export function getEmailQueue(userTenantId) {
  const tenantWhere = userTenantId ? ` AND tenant_id = ${userTenantId}` : ''

  const rows = db.prepare(
    `SELECT * FROM email_queue WHERE tenant_id = 1${tenantWhere} ORDER BY priority DESC, created_at LIMIT 20`
  ).all()

  const queuePending = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'pending'${tenantWhere}`
  ).get().c

  const queueProcessing = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'processing'${tenantWhere}`
  ).get().c

  const queueSent = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'sent'${tenantWhere}`
  ).get().c

  const queueFailed = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'failed'${tenantWhere}`
  ).get().c

  const queueRetry = db.prepare(
    `SELECT COUNT(*) AS c FROM email_queue WHERE status = 'retry'${tenantWhere}`
  ).get().c

  return {
    rows,
    counts: {
      pending: queuePending,
      processing: queueProcessing,
      sent: queueSent,
      failed: queueFailed,
      retry: queueRetry,
    },
  }
}

export function markQueue(queueId, patch) {
  const keys = Object.keys(patch)
  const sets = keys.map((k) => `${k} = ?`).join(', ')
  db.prepare(`UPDATE email_queue SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map((k) => patch[k]), queueId)
}
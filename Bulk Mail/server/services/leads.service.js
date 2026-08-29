import { db, transaction } from '../db/connection.js'
import { notFound, conflict, badRequest } from '../lib/errors.js'
import { fmtDateTime } from '../lib/format.js'
import { parseCsv, rowsToObjects } from '../lib/csv.js'
import { recordActivity } from './activities.service.js'
import { normalizeEmail } from '../lib/normalize.js'

const BASE_SELECT = `
  SELECT l.id, l.company, l.contact, l.email, l.status, l.notes,
         l.campaign_count, l.last_template, l.last_subject, l.last_email_sent_at,
         l.batch_id, l.created_at,
         b.name AS batch_name,
         c.name AS last_campaign_name
  FROM leads l
  LEFT JOIN lead_batches b ON b.id = l.batch_id
  LEFT JOIN campaigns c ON c.id = l.last_campaign_id`

function toUi(row) {
  return {
    id: row.id,
    company: row.company,
    contact: row.contact || '—',
    email: row.email,
    status: row.status,
    campaign: row.last_campaign_name || '—',
    template: row.last_template || '—',
    subject: row.last_subject || '—',
    lastSent: row.last_email_sent_at ? fmtDateTime(row.last_email_sent_at) : '—',
    campaignsCount: row.campaign_count,
    batch: row.batch_name || '—',
    batchId: row.batch_id,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export function listLeads(query) {
  const { search, status, batch, outreach, sent, page, pageSize, sort, order } = query
  const where = []
  const params = []

  if (search) {
    where.push(`(l.company LIKE ? OR l.email LIKE ? OR IFNULL(l.contact, '') LIKE ?)`)
    const like = `%${search}%`
    params.push(like, like, like)
  }
  if (status && status !== 'all') {
    where.push(`l.status = ?`)
    params.push(status)
  }
  if (batch && batch !== 'all') {
    where.push(`b.name = ?`)
    params.push(batch)
  }
  if (outreach === 'contacted') where.push(`l.last_email_sent_at IS NOT NULL`)
  if (outreach === 'never') where.push(`l.last_email_sent_at IS NULL`)
  if (sent === 'sent') where.push(`l.last_email_sent_at IS NOT NULL`)
  if (sent === 'not_sent') where.push(`l.last_email_sent_at IS NULL`)

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sortCol = { id: 'l.id', company: 'l.company COLLATE NOCASE', last_email_sent_at: 'l.last_email_sent_at', created_at: 'l.created_at' }[sort]

  const total = db.prepare(`SELECT COUNT(*) c FROM leads l LEFT JOIN lead_batches b ON b.id = l.batch_id ${whereSql}`).get(...params).c
  const rows = db.prepare(`${BASE_SELECT} ${whereSql} ORDER BY ${sortCol} ${order === 'desc' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize)

  return {
    data: rows.map(toUi),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

export function getLead(id) {
  const row = db.prepare(`${BASE_SELECT} WHERE l.id = ?`).get(id)
  if (!row) throw notFound('Lead not found')
  return toUi(row)
}

function assertEmailFree(email, exceptId = null) {
  const normalized = normalizeEmail(email)
  const existing = db.prepare(`SELECT id FROM leads WHERE normalized_email = ?`).get(normalized)
  if (existing && existing.id !== exceptId) {
    throw conflict(`A lead with email ${normalized} already exists`, { field: 'email' })
  }
}

export function createLead(input) {
  return transaction(() => {
    assertEmailFree(input.email)
    if (input.batchId) {
      const b = db.prepare(`SELECT id FROM lead_batches WHERE id = ?`).get(input.batchId)
      if (!b) throw badRequest('Selected batch does not exist')
    }
    const id = db.prepare(
      `INSERT INTO leads (company, contact, email, status, batch_id, notes) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(input.company, input.contact, normalizeEmail(input.email), input.status, input.batchId ?? null, input.notes).lastInsertRowid
    db.prepare(`UPDATE leads SET normalized_email = LOWER(TRIM(email)) WHERE id = ?`).run(id)
    recordActivity('lead_created', input.company, `Lead added: ${input.company} (${normalizeEmail(input.email)})`)
    return getLead(id)
  })
}

export function updateLead(id, input) {
  return transaction(() => {
    const existing = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(id)
    if (!existing) throw notFound('Lead not found')
    const next = { ...existing, ...input }
    if (input.email && normalizeEmail(input.email) !== normalizeEmail(existing.email)) {
      assertEmailFree(input.email, id)
    }
    db.prepare(
      `UPDATE leads SET company = ?, contact = ?, email = ?, normalized_email = ?, status = ?, batch_id = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(next.company, next.contact, normalizeEmail(next.email), normalizeEmail(next.email), next.status, next.batch_id ?? null, next.notes, id)
    return getLead(id)
  })
}

export function deleteLead(id) {
  const res = db.prepare(`DELETE FROM leads WHERE id = ?`).run(id)
  if (res.changes === 0) throw notFound('Lead not found')
  return { deleted: res.changes }
}

export function deleteLeads(ids) {
  return transaction(() => {
    const stmt = db.prepare(`DELETE FROM leads WHERE id = ?`)
    let deleted = 0
    for (const id of ids) deleted += stmt.run(id).changes
    return { deleted }
  })
}

export function exportLeads(query) {
  const { data } = listLeads({ ...query, page: 1, pageSize: 100 })
  // export everything matching the filter (chunk through pages)
  let all = [...data]
  let page = 2
  const { totalPages } = listLeads({ ...query, page: 1, pageSize: 100 }).pagination
  while (page <= totalPages) {
    all = all.concat(listLeads({ ...query, page, pageSize: 100 }).data)
    page++
  }
  return all.map((l) => ({
    Company: l.company,
    Contact: l.contact,
    Email: l.email,
    Status: l.status,
    Batch: l.batch,
    'Last Campaign': l.campaign,
    'Last Template': l.template,
    Subject: l.subject,
    'Last Email Sent': l.lastSent,
  }))
}

export function importLeads(csvText, batchId) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) throw badRequest('CSV must contain a header row and at least one data row')
  const objects = rowsToObjects(rows)
  if (!objects.length) throw badRequest('No data rows found in CSV')

  let batchName = null
  if (batchId) {
    const b = db.prepare(`SELECT id, name FROM lead_batches WHERE id = ?`).get(batchId)
    if (!b) throw badRequest('Selected batch does not exist')
    batchName = b.name
  }

  const results = { imported: 0, skipped: 0, failed: 0, errors: [] }
  transaction(() => {
    const insert = db.prepare(
      `INSERT INTO leads (company, contact, email, status, batch_id) VALUES (?, ?, ?, 'new', ?)`
    )
    objects.forEach((r, i) => {
      const line = i + 2
      const company = (r.company || r.company_name || '').trim()
      const email = normalizeEmail(r.email || r.email_address || '')
      const contact = (r.contact || r.contact_person || '').trim() || null
      if (!company || !email) {
        results.failed++
        results.errors.push({ line, reason: !email ? 'Missing email' : 'Missing company' })
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.failed++
        results.errors.push({ line, reason: `Invalid email: ${email}` })
        return
      }
      if (db.prepare(`SELECT id FROM leads WHERE normalized_email = ?`).get(email)) {
        results.skipped++
        results.errors.push({ line, reason: `Duplicate email: ${email}` })
        return
      }
      if (db.prepare(`SELECT id FROM blocked_contacts WHERE normalized_email = ?`).get(email)) {
        results.skipped++
        results.errors.push({ line, reason: `Blocked contact: ${email}` })
        return
      }
      insert.run(company, contact, email, batchId ?? null)
      db.prepare(`UPDATE leads SET normalized_email = LOWER(TRIM(email)) WHERE email = ?`).run(email)
      results.imported++
    })
  })

  if (results.imported > 0) {
    recordActivity('lead_imported', batchName || 'CSV Import', `Imported ${results.imported} leads from CSV${batchName ? ` into ${batchName}` : ''}`)
  }
  return results
}

export function listBatchOptions() {
  return db.prepare(`SELECT id, name FROM lead_batches ORDER BY id`).all()
}

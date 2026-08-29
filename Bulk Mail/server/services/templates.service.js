import { db, transaction } from '../db/connection.js'
import { notFound, badRequest } from '../lib/errors.js'
import { fmtDateHuman } from '../lib/format.js'

export const CATEGORIES = ['Initial Outreach', 'Followup 1', 'Followup 2', 'Proposal', 'Meeting Reminder']

const extractVars = (...texts) =>
  [...new Set(texts.flatMap((t) => [...(t || '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1])))]

export function renderTemplate(text, values = {}) {
  const rendered = (text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key) && values[key] != null && values[key] !== '') {
      return String(values[key])
    }
    return m
  })
  return rendered
}

export function hasUnresolvedVariables(text) {
  return /\{\{\s*\w+\s*\}\}/.test(text || '')
}

function toUi(row) {
  let variables = []
  try { variables = JSON.parse(row.variables) } catch { /* ignore */ }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subject: row.subject,
    body: row.body,
    variables: variables.length ? variables : extractVars(row.subject, row.body),
    updatedAt: fmtDateHuman(row.updated_at),
    createdAt: row.created_at,
  }
}

export function listTemplates() {
  return db.prepare(`SELECT * FROM templates ORDER BY category, id`).all().map(toUi)
}

export function getTemplate(id) {
  const row = db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id)
  if (!row) throw notFound('Template not found')
  return toUi(row)
}

export function createTemplate(input) {
  const variables = extractVars(input.subject, input.body)
  const id = db.prepare(
    `INSERT INTO templates (name, category, subject, body, variables) VALUES (?, ?, ?, ?, ?)`
  ).run(input.name, input.category, input.subject, input.body, JSON.stringify(variables)).lastInsertRowid
  return getTemplate(id)
}

export function updateTemplate(id, input) {
  return transaction(() => {
    const existing = db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id)
    if (!existing) throw notFound('Template not found')
    const next = { ...existing, ...input }
    const variables = extractVars(next.subject, next.body)
    db.prepare(
      `UPDATE templates SET name = ?, category = ?, subject = ?, body = ?, variables = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(next.name, next.category, next.subject, next.body, JSON.stringify(variables), id)
    return getTemplate(id)
  })
}

export function deleteTemplate(id) {
  const res = db.prepare(`DELETE FROM templates WHERE id = ?`).run(id)
  if (res.changes === 0) throw notFound('Template not found')
  return { deleted: res.changes }
}

export function duplicateTemplate(id) {
  return transaction(() => {
    const existing = db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id)
    if (!existing) throw notFound('Template not found')
    const id2 = db.prepare(
      `INSERT INTO templates (name, category, subject, body, variables) VALUES (?, ?, ?, ?, ?)`
    ).run(`${existing.name} (copy)`, existing.category, existing.subject, existing.body, existing.variables).lastInsertRowid
    return getTemplate(id2)
  })
}

/** Render template with sample (or provided) values so the UI can preview it. */
export function previewTemplate(id, sample = {}) {
  const tpl = getTemplate(id)
  const vars = { company: 'Example News', contact: 'Ravi Singh', ...sample }
  return {
    id: tpl.id,
    name: tpl.name,
    variables: tpl.variables,
    subject: renderTemplate(tpl.subject, vars),
    body: renderTemplate(tpl.body, vars),
  }
}

export function categories() {
  return CATEGORIES
}

export function assertTemplateExists(id) {
  if (!db.prepare(`SELECT id FROM templates WHERE id = ?`).get(id)) throw badRequest('Selected template does not exist')
}

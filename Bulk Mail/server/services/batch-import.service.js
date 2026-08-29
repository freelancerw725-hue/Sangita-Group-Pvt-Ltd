import { db, transaction } from '../db/connection.js'
import { normalizeEmail } from '../lib/normalize.js'
import { badRequest } from '../lib/errors.js'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Mock verification check — same logic as Lead Finder MockEmailVerifier
function mockVerificationStatus(email) {
  const t = email.trim().toLowerCase()
  if (!t || !isValidEmail(t)) return 'invalid'
  const domain = t.split('@')[1] || ''
  const disposable = new Set(['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com'])
  if (disposable.has(domain) || t.includes('test') || t.includes('noreply') || t.includes('no-reply')) return 'risky'
  if (t.includes('invalid') || domain === 'invalid.com') return 'invalid'
  if (t.endsWith('.unknown') || t.includes('unknown')) return 'unknown'
  if (!t) return 'not_verified'
  return 'valid'
}

export function getBatchImportBySheetId(sheetId) {
  return db.prepare(`SELECT * FROM batch_imports WHERE sheet_id = ?`).get(sheetId) || null
}

export function listBatchImports() {
  return db.prepare(`SELECT * FROM batch_imports ORDER BY id DESC`).all()
}

export function importLeadsFromSheet({ sheetId, sheetName, templateId, leads }) {
  if (!sheetId || !sheetName || !Array.isArray(leads)) throw badRequest('Invalid import payload')
  if (leads.length === 0) throw badRequest('No leads provided')
  if (leads.length > 5000) throw badRequest('Batch too large (max 5000)')

  // Idempotency: if sheet already imported, return existing without duplicating
  const existing = getBatchImportBySheetId(sheetId)
  if (existing) {
    const batch = existing.batch_id ? db.prepare(`SELECT * FROM lead_batches WHERE id = ?`).get(existing.batch_id) : null
    // Per spec, second import of same sheet should be idempotent with imported 0
    // and duplicates = total (all leads now considered duplicates)
    return {
      idempotent: true,
      batchId: existing.batch_id,
      batchName: batch ? batch.name : sheetName,
      total: existing.total,
      imported: 0,
      duplicates: existing.total,
      rejected: 0,
      sheetId: existing.sheet_id,
    }
  }

  let imported = 0
  let duplicates = 0
  let rejected = 0
  const errors = []

  // Use transaction for batch + leads
  const batchId = transaction(() => {
    // Create batch with unique name — if name already exists, append sheetId suffix
    let batchName = sheetName.trim()
    const nameExists = db.prepare(`SELECT id FROM lead_batches WHERE name = ?`).get(batchName)
    if (nameExists) batchName = `${sheetName.trim()} [${sheetId.slice(0, 8)}]`
    // Check again for collision after suffix
    let finalName = batchName
    let suffix = 1
    while (db.prepare(`SELECT id FROM lead_batches WHERE name = ?`).get(finalName)) {
      finalName = `${batchName} #${suffix++}`
    }
    const bId = db.prepare(`INSERT INTO lead_batches (name, source, status, notes) VALUES (?, 'Manual entry', 'ready', ?)`).run(finalName, `lead_finder:${sheetId}`).lastInsertRowid

    const insertLead = db.prepare(`INSERT INTO leads (company, contact, email, normalized_email, status, batch_id, notes) VALUES (?, ?, ?, ?, 'new', ?, ?)`)
    const checkLead = db.prepare(`SELECT id FROM leads WHERE normalized_email = ?`)
    const checkBlocked = db.prepare(`SELECT id FROM blocked_contacts WHERE normalized_email = ?`)

    for (let i = 0; i < leads.length; i++) {
      const raw = leads[i]
      const rawEmail = raw.email ?? ''
      const email = normalizeEmail(rawEmail)
      const company = (raw.company || raw.name || '').trim() || 'Unknown'
      const contact = (raw.name || raw.contact || '').trim() || null

      // Never import: invalid format, unverified (empty), pending_review/rejected/invalid via payload flags
      // Payload may contain approvalStatus / verificationStatus — if provided, enforce
      const approval = raw.approvalStatus || raw.approval_status || null
      const verification = raw.emailVerificationStatus || raw.verificationStatus || null
      if (approval && approval !== 'approved') {
        rejected++
        errors.push({ index: i, email: rawEmail, reason: `Rejected approvalStatus: ${approval}` })
        continue
      }
      if (verification && (verification === 'invalid' || verification === 'not_verified')) {
        rejected++
        errors.push({ index: i, email: rawEmail, reason: `Rejected verification: ${verification}` })
        continue
      }
      // Mock verification check for invalid/unverified
      if (!email || !isValidEmail(email)) {
        rejected++
        errors.push({ index: i, email: rawEmail, reason: 'Invalid email format' })
        continue
      }
      const vStatus = mockVerificationStatus(email)
      if (vStatus === 'invalid') {
        rejected++
        errors.push({ index: i, email, reason: 'Invalid email (mock verification)' })
        continue
      }
      if (!email) {
        rejected++
        errors.push({ index: i, email: rawEmail, reason: 'Unverified (empty email)' })
        continue
      }

      // Duplicate protection: normalized email check
      if (checkLead.get(email)) {
        duplicates++
        continue
      }
      if (checkBlocked.get(email)) {
        // Blocked counts as rejected (or duplicate?) — spec says duplicates vs rejected separate
        rejected++
        errors.push({ index: i, email, reason: 'Blocked contact' })
        continue
      }

      try {
        insertLead.run(company, contact, email, email, bId, `imported from sheet:${sheetId}`)
        imported++
      } catch (e) {
        // Unique constraint race
        if (String(e.message).includes('UNIQUE') || String(e.message).includes('unique')) {
          duplicates++
        } else {
          rejected++
          errors.push({ index: i, email, reason: e.message })
        }
      }
    }

    // Validate templateId exists, otherwise store null (FK constraint)
    let tplId = templateId ?? null
    if (tplId !== null) {
      const tplExists = db.prepare(`SELECT id FROM templates WHERE id = ?`).get(tplId)
      if (!tplExists) tplId = null
    }
    // Create import record for idempotency
    db.prepare(`
      INSERT INTO batch_imports (sheet_id, sheet_name, batch_id, template_id, source, total, imported, duplicates, rejected)
      VALUES (?, ?, ?, ?, 'lead_finder', ?, ?, ?, ?)
    `).run(sheetId, sheetName, bId, tplId, leads.length, imported, duplicates, rejected)

    return bId
  })

  const batch = db.prepare(`SELECT * FROM lead_batches WHERE id = ?`).get(batchId)
  return {
    idempotent: false,
    batchId,
    batchName: batch.name,
    total: leads.length,
    imported,
    duplicates,
    rejected,
    sheetId,
    errors: errors.length ? errors : undefined,
  }
}

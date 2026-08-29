import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok } from './helpers.js'
import { z } from 'zod'
import { formatZodError } from '../validation/schemas.js'
import { badRequest, unauthorized } from '../lib/errors.js'
import { importLeadsFromSheet, getBatchImportBySheetId } from '../services/batch-import.service.js'

const router = Router()

// Rate limiting: simple in-memory per IP
const windowMs = 60_000
const maxRequests = 30
const ipMap = new Map()
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
  const now = Date.now()
  const entry = ipMap.get(ip)
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + windowMs })
    return next()
  }
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ error: { message: 'Rate limit exceeded. Try again later.' } })
  }
  entry.count++
  next()
}

function getImportKey() {
  return (process.env.BULK_MAIL_IMPORT_KEY || process.env.BATCH_IMPORT_KEY || process.env.LEAD_FINDER_AUTOMATION_KEY || process.env.BULK_MAIL_API_KEY || '').trim()
}

function requireImportAuth(req, res, next) {
  const expected = getImportKey()
  // In test, allow if no key set (for local dev), but in production require
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return next(unauthorized('Import API key not configured'))
    }
    return next()
  }
  const headerKey = (req.headers['x-api-key'] || req.headers['x-batch-key'] || '').trim()
  const authHeader = (req.headers['authorization'] || '').trim()
  let token = ''
  if (authHeader.toLowerCase().startsWith('bearer ')) token = authHeader.slice(7).trim()
  if (headerKey && headerKey === expected) return next()
  if (token && token === expected) return next()
  // Also allow api_key query
  const qp = (req.query.api_key || req.query.key || '').trim()
  if (qp && qp === expected) return next()
  return next(unauthorized('Missing or invalid import API key. Use x-api-key or Authorization: Bearer'))
}

const importSchema = z.object({
  sheetId: z.string().trim().min(1).max(200),
  sheetName: z.string().trim().min(1).max(200),
  templateId: z.coerce.number().int().positive(),
  leads: z.array(z.object({
    id: z.string().trim().min(1).max(200),
    email: z.string().trim().min(1).max(254),
    name: z.string().trim().max(200).optional().or(z.literal('')),
    company: z.string().trim().max(200).optional().or(z.literal('')),
    approvalStatus: z.enum(['pending_review', 'approved', 'rejected']).optional(),
    emailVerificationStatus: z.enum(['valid', 'invalid', 'risky', 'unknown', 'not_verified']).optional(),
  })).min(1).max(5000),
})

router.post('/batches/import', rateLimit, requireImportAuth, asyncHandler(async (req, res) => {
  const parsed = importSchema.safeParse(req.body)
  if (!parsed.success) {
    throw badRequest('Validation failed', formatZodError(parsed.error))
  }
  const { sheetId, sheetName, templateId, leads } = parsed.data

  // Idempotency check before import
  const existing = getBatchImportBySheetId(sheetId)
  if (existing) {
    // Return idempotent response without re-importing — per spec, second import should have imported 0, duplicates = total
    return ok(res, {
      idempotent: true,
      batchId: existing.batch_id,
      batchName: null,
      total: existing.total,
      imported: 0,
      duplicates: existing.total,
      rejected: 0,
      sheetId: existing.sheet_id,
      message: 'Sheet already imported — idempotent response.',
    })
  }

  const result = importLeadsFromSheet({ sheetId, sheetName, templateId, leads })

  // Never expose secrets, never trigger SMTP/queue
  ok(res, {
    batchId: result.batchId,
    batchName: result.batchName,
    sheetId: result.sheetId,
    total: result.total,
    imported: result.imported,
    duplicates: result.duplicates,
    rejected: result.rejected,
    idempotent: result.idempotent,
    errors: result.errors,
  }, 201)
}))

export default router

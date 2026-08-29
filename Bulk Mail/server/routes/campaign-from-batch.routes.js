import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok } from './helpers.js'
import { z } from 'zod'
import { formatZodError } from '../validation/schemas.js'
import { badRequest, unauthorized } from '../lib/errors.js'
import { createCampaignFromBatch } from '../services/campaign-from-batch.service.js'

const router = Router()

// Rate limiting
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

function getAuthKey() {
  return (process.env.BULK_MAIL_CAMPAIGN_KEY || process.env.BULK_MAIL_IMPORT_KEY || process.env.BATCH_IMPORT_KEY || process.env.LEAD_FINDER_AUTOMATION_KEY || process.env.BULK_MAIL_API_KEY || '').trim()
}

function requireAuth(req, res, next) {
  const expected = getAuthKey()
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return next(unauthorized('Campaign API key not configured'))
    }
    return next()
  }
  const headerKey = (req.headers['x-api-key'] || req.headers['x-campaign-key'] || '').trim()
  const authHeader = (req.headers['authorization'] || '').trim()
  let token = ''
  if (authHeader.toLowerCase().startsWith('bearer ')) token = authHeader.slice(7).trim()
  if (headerKey && headerKey === expected) return next()
  if (token && token === expected) return next()
  const qp = (req.query.api_key || req.query.key || '').trim()
  if (qp && qp === expected) return next()
  return next(unauthorized('Missing or invalid campaign API key. Use x-api-key or Authorization: Bearer'))
}

const schema = z.object({
  batchId: z.coerce.number().int().positive(),
  templateId: z.coerce.number().int().positive(),
  sendAt: z.string().max(100).optional().nullable(),
})

router.post('/campaigns/from-batch', rateLimit, requireAuth, asyncHandler(async (req, res) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    throw badRequest('Validation failed', formatZodError(parsed.error))
  }
  const { batchId, templateId, sendAt } = parsed.data

  const result = await createCampaignFromBatch({ batchId, templateId, sendAt: sendAt ?? undefined })

  if (result.idempotent) {
    return ok(res, {
      idempotent: true,
      campaignId: result.campaignId,
      batchId: result.batchId,
      templateId: result.templateId,
      status: result.status,
      recipientCount: result.recipientCount,
      campaign: result.campaign,
    })
  }

  ok(res, {
    campaignId: result.campaignId,
    batchId: result.batchId,
    templateId: result.templateId,
    status: result.status,
    recipientCount: result.recipientCount,
    campaign: result.campaign,
  }, 201)
}))

export default router

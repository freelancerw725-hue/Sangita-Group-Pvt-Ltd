import { Router } from 'express'
import health from './health.routes.js'
import dashboard from './dashboard.routes.js'
import leads from './leads.routes.js'
import templates from './templates.routes.js'
import campaigns from './campaigns.routes.js'
import blocked from './blocked.routes.js'
import batches from './batches.routes.js'
import batchImport from './batch-import.routes.js'
import campaignFromBatch from './campaign-from-batch.routes.js'
import auth from './auth.routes.js'
import senders from './senders.routes.js'
import analytics from './analytics.routes.js'
import customers from './customers.routes.js'
import settings from './settings.routes.js'
import { db } from '../db/connection.js'
import { asyncHandler } from '../lib/errors.js'
import { getEmailQueue } from '../services/email-queue.service.js'

const router = Router()

// Opportunities route - MUST be registered BEFORE the catch-all
router.get('/opportunities', asyncHandler(async (req, res) => {
  const opportunities = db.prepare(`
    SELECT o.id, o.lead_id, o.stage_id, o.title, o.value, o.status, o.closed_at, o.position,
           l.company, l.email, l.contact, l.status AS lead_status,
           ps.name AS stage_name, ps.color AS stage_color, ps.is_won, ps.is_lost
    FROM opportunities o
    JOIN leads l ON l.id = o.lead_id
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    ORDER BY o.position ASC, o.id ASC
  `).all()

  res.json(opportunities)
}))

// Queue route
router.get('/queue', asyncHandler(async (req, res) => {
  const userTenantId = req.user ? req.user.tenant_id : null
  const data = getEmailQueue(userTenantId)
  res.json(data)
}))

// Catch-all for other routes
router.use('/', health)
router.use('/', auth)
router.use('/', senders)
router.use('/', dashboard)
router.use('/', leads)
router.use('/', templates)
router.use('/', campaigns)
router.use('/', customers)
router.use('/', blocked)
router.use('/', batches)
router.use('/', batchImport)
router.use('/', campaignFromBatch)
router.use('/', analytics)
router.use('/', settings)

export default router

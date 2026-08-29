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

const router = Router()

router.use('/', health)
router.use('/', auth)
router.use('/', senders)
router.use('/', dashboard)
router.use('/', leads)
router.use('/', templates)
router.use('/', campaigns)
router.use('/', blocked)
router.use('/', batches)
router.use('/', batchImport)
router.use('/', campaignFromBatch)
router.use('/', analytics)

export default router

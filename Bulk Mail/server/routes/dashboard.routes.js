import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { getDashboard } from '../services/dashboard.service.js'

const router = Router()

router.get('/dashboard', asyncHandler(async (req, res) => {
  const userTenantId = req.user ? req.user.tenant_id : null
  const page = req.query.page ? Number(req.query.page) : undefined
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined
  const data = getDashboard(userTenantId, page, pageSize)
  res.json(data)
}))

export default router
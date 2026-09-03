import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { getEmailQueue, markQueue } from '../services/email-queue.service.js'

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  const userTenantId = req.user ? req.user.tenant_id : null
  const data = getEmailQueue(userTenantId)
  res.json(data)
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (!status) throw new Error('Status is required')
  markQueue(id, { status })
  res.json({ id, status })
}))

export default router
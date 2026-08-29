import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import { blockedCreateSchema } from '../validation/schemas.js'
import * as blocked from '../services/blocked.service.js'

const router = Router()

router.get('/blocked', asyncHandler(async (req, res) => {
  ok(res, { data: blocked.listBlocked() })
}))

router.post('/blocked', validate(blockedCreateSchema), asyncHandler(async (req, res) => {
  ok(res, blocked.toUi(blocked.blockContact(req.validatedBody, req.user?.id ?? null)), 201)
}))

router.delete('/blocked/:id', asyncHandler(async (req, res) => {
  ok(res, blocked.unblockContact(Number(req.params.id)))
}))

export default router

import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import {
  senderCreateSchema,
  senderUpdateSchema,
  senderStatusSchema,
  senderTestConnectionSchema,
  senderTestEmailSchema,
} from '../validation/schemas.js'
import * as senders from '../services/senders.service.js'
import { requireAuth } from '../services/auth.service.js'

const router = Router()

router.use(requireAuth)

router.get('/sender-accounts', asyncHandler(async (_req, res) => {
  ok(res, { data: senders.listSenders() })
}))

router.get('/sender-accounts/:id', asyncHandler(async (req, res) => {
  ok(res, senders.getSender(Number(req.params.id)))
}))

router.post('/sender-accounts', validate(senderCreateSchema), asyncHandler(async (req, res) => {
  ok(res, senders.createSender(req.validatedBody), 201)
}))

router.put('/sender-accounts/:id', validate(senderUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, senders.updateSender(Number(req.params.id), req.validatedBody))
}))

router.patch('/sender-accounts/:id/status', validate(senderStatusSchema), asyncHandler(async (req, res) => {
  ok(res, senders.setSenderEnabled(Number(req.params.id), req.validatedBody.enabled))
}))

router.delete('/sender-accounts/:id', asyncHandler(async (req, res) => {
  ok(res, senders.deleteSender(Number(req.params.id)))
}))

router.post('/sender-accounts/:id/test-connection', validate(senderTestConnectionSchema), asyncHandler(async (req, res) => {
  ok(res, await senders.testSenderConnection(Number(req.params.id), { timeoutMs: req.validatedBody.timeoutMs }))
}))

router.post('/sender-accounts/:id/test-email', validate(senderTestEmailSchema), asyncHandler(async (req, res) => {
  ok(res, await senders.sendTestEmail(Number(req.params.id), req.validatedBody))
}))

export default router

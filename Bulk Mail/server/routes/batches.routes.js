import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import { batchCreateSchema, batchUpdateSchema } from '../validation/schemas.js'
import * as batches from '../services/batches.service.js'

const router = Router()

router.get('/batches', asyncHandler(async (req, res) => {
  ok(res, { data: batches.listBatches() })
}))

router.get('/batches/:id', asyncHandler(async (req, res) => {
  ok(res, batches.getBatch(Number(req.params.id)))
}))

router.post('/batches', validate(batchCreateSchema), asyncHandler(async (req, res) => {
  ok(res, batches.createBatch(req.validatedBody), 201)
}))

router.put('/batches/:id', validate(batchUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, batches.updateBatch(Number(req.params.id), req.validatedBody))
}))

router.delete('/batches/:id', asyncHandler(async (req, res) => {
  ok(res, batches.deleteBatch(Number(req.params.id)))
}))

export default router
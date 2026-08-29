import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import { leadListQuerySchema, leadCreateSchema, leadUpdateSchema, bulkDeleteSchema, importCsvSchema } from '../validation/schemas.js'
import * as leads from '../services/leads.service.js'

const router = Router()
const q = (req) => ({ ...req.query, ...req.validatedQuery })

router.get('/leads', validate(leadListQuerySchema, 'query'), asyncHandler(async (req, res) => {
  ok(res, leads.listLeads(q(req)))
}))

router.get('/leads/export', validate(leadListQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const rows = leads.exportLeads(q(req))
  const header = Object.keys(rows[0] || { Company: '', Email: '' })
  const { objectsToCsv } = await import('../lib/csv.js')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"')
  res.send(objectsToCsv(rows, header))
}))

router.get('/leads/batch-options', asyncHandler(async (req, res) => {
  ok(res, leads.listBatchOptions())
}))

router.get('/leads/:id', asyncHandler(async (req, res) => {
  ok(res, leads.getLead(Number(req.params.id)))
}))

router.post('/leads', validate(leadCreateSchema), asyncHandler(async (req, res) => {
  ok(res, leads.createLead(req.validatedBody), 201)
}))

router.post('/leads/import', validate(importCsvSchema), asyncHandler(async (req, res) => {
  ok(res, leads.importLeads(req.validatedBody.csv, req.validatedBody.batchId ?? null))
}))

router.post('/leads/bulk-delete', validate(bulkDeleteSchema), asyncHandler(async (req, res) => {
  ok(res, leads.deleteLeads(req.validatedBody.ids))
}))

router.put('/leads/:id', validate(leadUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, leads.updateLead(Number(req.params.id), req.validatedBody))
}))

router.delete('/leads/:id', asyncHandler(async (req, res) => {
  ok(res, leads.deleteLead(Number(req.params.id)))
}))

export default router
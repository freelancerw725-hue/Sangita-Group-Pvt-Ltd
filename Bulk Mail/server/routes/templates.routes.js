import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import { templateCreateSchema, templateUpdateSchema } from '../validation/schemas.js'
import * as templates from '../services/templates.service.js'

const router = Router()

router.get('/templates', asyncHandler(async (req, res) => {
  ok(res, { data: templates.listTemplates(), categories: templates.categories() })
}))

router.get('/templates/:id/preview', asyncHandler(async (req, res) => {
  ok(res, templates.previewTemplate(Number(req.params.id), {
    company: req.query.company || undefined,
    contact: req.query.contact || undefined,
  }))
}))

router.get('/templates/:id', asyncHandler(async (req, res) => {
  ok(res, templates.getTemplate(Number(req.params.id)))
}))

router.post('/templates', validate(templateCreateSchema), asyncHandler(async (req, res) => {
  ok(res, templates.createTemplate(req.validatedBody), 201)
}))

router.post('/templates/:id/duplicate', asyncHandler(async (req, res) => {
  ok(res, templates.duplicateTemplate(Number(req.params.id)), 201)
}))

router.put('/templates/:id', validate(templateUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, templates.updateTemplate(Number(req.params.id), req.validatedBody))
}))

router.delete('/templates/:id', asyncHandler(async (req, res) => {
  ok(res, templates.deleteTemplate(Number(req.params.id)))
}))

export default router
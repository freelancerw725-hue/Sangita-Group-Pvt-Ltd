import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok } from './helpers.js'
import { getDashboard } from '../services/dashboard.service.js'

const router = Router()

router.get('/dashboard', asyncHandler(async (req, res) => {
  ok(res, getDashboard())
}))

export default router
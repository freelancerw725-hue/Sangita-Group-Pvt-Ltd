import { Router } from 'express'
import { db } from '../db/connection.js'
import { ok } from './helpers.js'
import { asyncHandler } from '../lib/errors.js'

const router = Router()

router.get('/health', asyncHandler(async (req, res) => {
  const row = db.prepare(`SELECT COUNT(*) c FROM _migrations`).get()
  ok(res, { status: 'ok', service: 'swiftgrowth-crm-api', migrations: row.c, time: new Date().toISOString() })
}))

export default router
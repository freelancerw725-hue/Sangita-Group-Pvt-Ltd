import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { db } from '../db/connection.js'

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  const opportunities = db.prepare(`
    SELECT o.id, o.lead_id, o.stage_id, o.title, o.value, o.status, o.closed_at, o.position,
           l.company, l.email, l.contact, l.status AS lead_status,
           ps.name AS stage_name, ps.color AS stage_color, ps.is_won, ps.is_lost
    FROM opportunities o
    JOIN leads l ON l.id = o.lead_id
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    ORDER BY o.position ASC, o.id ASC
  `).all()

  res.json(opportunities)
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { stage_id } = req.body
  if (stage_id === undefined) throw new Error('stage_id is required')

  const result = db.prepare(
    `UPDATE opportunities SET stage_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(stage_id, id)

  if (result.changes === 0) throw new Error('Opportunity not found')

  const row = db.prepare(`
    SELECT o.id, o.lead_id, o.stage_id, o.title, o.value, o.status, o.closed_at, o.position,
           l.company, l.email, l.contact, l.status AS lead_status,
           ps.name AS stage_name, ps.color AS stage_color, ps.is_won, ps.is_lost
    FROM opportunities o
    JOIN leads l ON l.id = o.lead_id
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    WHERE o.id = ?
  `).get(id)

  res.json(row)
}))

export default router

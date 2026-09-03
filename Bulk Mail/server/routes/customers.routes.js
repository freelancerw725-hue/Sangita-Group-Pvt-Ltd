import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { db } from '../db/connection.js'

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  const customers = db.prepare("SELECT id, lead_id, company, contact, email, phone, deal_value, won_on, source, notes, created_at, updated_at FROM customers").all()
  res.json(customers)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const customer = db.prepare("SELECT id, lead_id, company, contact, email, phone, deal_value, won_on, source, notes, created_at, updated_at FROM customers WHERE id = ?").get(req.params.id)
  if (customer) {
    res.json(customer)
  } else {
    res.status(404).json({ error: 'Customer not found' })
  }
}))

export default router

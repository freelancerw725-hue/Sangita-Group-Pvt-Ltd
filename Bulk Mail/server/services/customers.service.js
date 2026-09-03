import { db } from '../db/connection.js'

export function getCustomers() {
  return db.prepare("SELECT id, lead_id, company, contact, email, phone, deal_value, won_on, source, notes, created_at, updated_at FROM customers").all()
}

export function getCustomer(id) {
  return db.prepare("SELECT id, lead_id, company, contact, email, phone, deal_value, won_on, source, notes, created_at, updated_at FROM customers WHERE id = ?").get(id)
}

export function createCustomer(customer) {
  const result = db.prepare("INSERT INTO customers (lead_id, company, contact, email, phone, deal_value, won_on, source, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))").run(
    customer.lead_id,
    customer.company,
    customer.contact,
    customer.email,
    customer.phone,
    customer.deal_value,
    customer.won_on,
    customer.source,
    customer.notes
  )
  return { id: result.lastInsertRowid, ...customer }
}

export function updateCustomer(id, customer) {
  db.prepare("UPDATE customers SET lead_id = ?, company = ?, contact = ?, email = ?, phone = ?, deal_value = ?, won_on = ?, source = ?, notes = ?, updated_at = datetime('now') WHERE id = ?").run(
    customer.lead_id,
    customer.company,
    customer.contact,
    customer.email,
    customer.phone,
    customer.deal_value,
    customer.won_on,
    customer.source,
    customer.notes,
    id
  )
  return { id, ...customer }
}

export function deleteCustomer(id) {
  db.prepare("DELETE FROM customers WHERE id = ?").run(id)
}

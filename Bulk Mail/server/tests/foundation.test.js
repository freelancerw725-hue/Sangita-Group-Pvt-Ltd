import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-mail-test-'))
process.env.NODE_ENV = 'test'
process.env.DB_PATH = path.join(tempDir, 'crm.db')
process.env.DEFAULT_ADMIN_EMAIL = 'admin@test.local'
process.env.DEFAULT_ADMIN_PASSWORD = 'super-secret'

const { normalizeEmail } = await import('../lib/normalize.js')
const { hashPassword, verifyPassword } = await import('../lib/password.js')
const { db } = await import('../db/connection.js')
const { loginPayload, getSessionUser } = await import('../services/auth.service.js')
const leads = await import('../services/leads.service.js')
const blocked = await import('../services/blocked.service.js')
const campaigns = await import('../services/campaigns.service.js')
const templates = await import('../services/templates.service.js')

test('normalizes emails and verifies passwords', () => {
  assert.equal(normalizeEmail('  Example@Mail.com '), 'example@mail.com')
  const hash = hashPassword('abc12345')
  assert.equal(verifyPassword('abc12345', hash), true)
  assert.equal(verifyPassword('wrong', hash), false)
})

test('boots a default admin and creates a session cookie', () => {
  const users = db.prepare(`SELECT email, password_hash FROM users ORDER BY id`).all()
  assert.equal(users.length, 1)
  assert.equal(users[0].email, 'admin@test.local')
  assert.ok(users[0].password_hash)

  const { user, cookie } = loginPayload({ email: 'admin@test.local', password: 'super-secret' })
  assert.equal(user.email, 'admin@test.local')
  assert.match(cookie, /bulk_mail_session=/)

  const req = { headers: { cookie } }
  const sessionUser = getSessionUser(req)
  assert.equal(sessionUser.email, 'admin@test.local')
})

test('prevents duplicate leads by normalized email', () => {
  const first = leads.createLead({
    company: 'Alpha News',
    contact: 'Ravi',
    email: 'Ravi@Example.com',
    status: 'new',
    batchId: null,
    notes: null,
  })
  assert.equal(first.email, 'ravi@example.com')

  assert.throws(() => {
    leads.createLead({
      company: 'Beta News',
      contact: 'Ravi 2',
      email: '  ravi@example.com ',
      status: 'new',
      batchId: null,
      notes: null,
    })
  }, /already exists/)
})

test('excludes blocked contacts from campaign recipient selection', () => {
  const tpl = templates.createTemplate({
    name: 'Foundation Template',
    category: 'Initial Outreach',
    subject: 'Hello {{company}}',
    body: 'Hi {{contact_name}} from {{company}}',
  })

  const lead = leads.createLead({
    company: 'Gamma Media',
    contact: 'Nikhil',
    email: 'gamma@example.com',
    status: 'new',
    batchId: null,
    notes: null,
  })

  blocked.blockContact({
    email: 'gamma@example.com',
    company: 'Gamma Media',
    reason: 'Asked Not To Contact',
    notes: null,
  })

  assert.throws(() => {
    campaigns.createCampaign({
      name: 'Blocked Campaign',
      templateId: tpl.id,
      audience: { type: 'manual', leadIds: [lead.id] },
      dailyLimit: 50,
      delaySeconds: 15,
      status: 'draft',
    })
  }, /No eligible recipients/)
})

test.after(() => {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

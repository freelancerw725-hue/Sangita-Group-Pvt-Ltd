import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-mail-senders-'))
process.env.NODE_ENV = 'test'
process.env.DB_PATH = path.join(tempDir, 'crm.db')
process.env.DEFAULT_ADMIN_EMAIL = 'admin@test.local'
process.env.DEFAULT_ADMIN_PASSWORD = 'super-secret'

const {
  senderCreateSchema,
  senderUpdateSchema,
  senderTestEmailSchema,
} = await import('../validation/schemas.js')
const { db } = await import('../db/connection.js')
const { loginPayload } = await import('../services/auth.service.js')
const senders = await import('../services/senders.service.js')

const authCookie = loginPayload({ email: 'admin@test.local', password: 'super-secret' }).cookie
assert.ok(authCookie.includes('bulk_mail_session='))

test('sender validation rejects bad SMTP config', () => {
  assert.throws(() => senderCreateSchema.parse({
    name: '',
    email: 'bad-email',
    smtpHost: '',
    smtpPort: 70000,
    username: '',
    password: '',
  }))
  assert.throws(() => senderUpdateSchema.parse({ smtpPort: 0 }))
  assert.throws(() => senderTestEmailSchema.parse({ recipient: 'bad', subject: 'x', body: 'y' }))
})

test('creates and returns sender details without password', () => {
  const sender = senders.createSender({
    name: 'Primary Sender',
    email: 'Sender@Example.com',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'sender@example.com',
    password: 'smtp-secret',
    securityMode: 'tls',
    dailyLimit: 200,
    hourlyLimit: 50,
    enabled: true,
  })

  assert.equal(sender.email, 'sender@example.com')
  assert.equal(sender.securityMode, 'tls')
  assert.equal(sender.enabled, true)
  assert.equal(Object.prototype.hasOwnProperty.call(sender, 'password'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(sender, 'passwordSecret'), false)

  const fetched = senders.getSender(sender.id)
  assert.equal(fetched.email, 'sender@example.com')
  assert.equal(Object.prototype.hasOwnProperty.call(fetched, 'password_secret'), false)

  const listed = senders.listSenders()
  assert.equal(listed[0].email, 'sender@example.com')
  assert.equal(Object.prototype.hasOwnProperty.call(listed[0], 'password_secret'), false)
})

test('updates and toggles sender enabled state', () => {
  const sender = senders.createSender({
    name: 'Toggle Sender',
    email: 'toggle@example.com',
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    username: 'toggle@example.com',
    password: 'initial-secret',
    securityMode: 'ssl',
    dailyLimit: 100,
    hourlyLimit: 25,
    enabled: true,
  })

  const updated = senders.updateSender(sender.id, {
    name: 'Toggle Sender Updated',
    dailyLimit: 150,
    hourlyLimit: 25,
    password: 'new-secret',
  })
  assert.equal(updated.name, 'Toggle Sender Updated')
  assert.equal(updated.dailyLimit, 150)
  assert.equal(updated.enabled, true)
  assert.equal(Object.prototype.hasOwnProperty.call(updated, 'password_secret'), false)

  const disabled = senders.setSenderEnabled(sender.id, false)
  assert.equal(disabled.enabled, false)

  const enabled = senders.setSenderEnabled(sender.id, true)
  assert.equal(enabled.enabled, true)
})

test('connection test handles provider failures', async () => {
  const sender = senders.createSender({
    name: 'Conn Sender',
    email: 'conn@example.com',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'conn@example.com',
    password: 'conn-secret',
    securityMode: 'tls',
    dailyLimit: 200,
    hourlyLimit: 40,
    enabled: true,
  })

  await assert.rejects(
    () => senders.testSenderConnection(sender.id, {
      timeoutMs: 1500,
      transportFactory: () => ({ verify: async () => { throw new Error('verify failed') } }),
    }),
    (error) => error.status === 502 && /SMTP connection verification failed/.test(error.message),
  )

  const refreshed = senders.getSender(sender.id)
  assert.equal(refreshed.lastTestStatus, 'failed')
  assert.match(refreshed.lastTestError || '', /SMTP connection verification failed/)
})

test('test email handles provider failures and records results', async () => {
  const sender = senders.createSender({
    name: 'Mail Sender',
    email: 'mail@example.com',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    username: 'mail@example.com',
    password: 'mail-secret',
    securityMode: 'tls',
    dailyLimit: 200,
    hourlyLimit: 40,
    enabled: true,
  })

  await assert.rejects(
    () => senders.sendTestEmail(sender.id, {
      recipient: 'lead@example.com',
      subject: 'Hello',
      body: 'Body',
    }, {
      transportFactory: () => ({ sendMail: async () => { throw new Error('send failed') } }),
    }),
    (error) => error.status === 502 && /SMTP test email failed/.test(error.message),
  )

  const failedEmail = db.prepare(`SELECT status, error FROM emails ORDER BY id DESC LIMIT 1`).get()
  assert.equal(failedEmail.status, 'failed')
  assert.match(failedEmail.error || '', /SMTP test email failed/)

  const success = await senders.sendTestEmail(sender.id, {
    recipient: 'lead2@example.com',
    subject: 'Hello Again',
    body: 'Body 2',
  }, {
    transportFactory: () => ({
      sendMail: async () => ({
        messageId: '<message-123@example.com>',
        accepted: ['lead2@example.com'],
        rejected: [],
        response: '250 OK',
      }),
    }),
  })
  assert.equal(success.ok, true)
  assert.equal(success.messageId, '<message-123@example.com>')

  const successEmail = db.prepare(`SELECT status, provider_message_id FROM emails ORDER BY id DESC LIMIT 1`).get()
  assert.equal(successEmail.status, 'sent')
  assert.equal(successEmail.provider_message_id, '<message-123@example.com>')
})

test('run-time queries never expose SMTP secrets', () => {
  const row = db.prepare(`SELECT password_secret FROM sender_accounts WHERE email = ?`).get('mail@example.com')
  assert.equal(typeof row.password_secret, 'string')
  const exposed = senders.getSender(senders.listSenders().find((s) => s.email === 'mail@example.com').id)
  assert.equal(Object.prototype.hasOwnProperty.call(exposed, 'password_secret'), false)
})

test.after(() => {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

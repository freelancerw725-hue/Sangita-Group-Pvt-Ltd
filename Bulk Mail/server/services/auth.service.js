import { randomBytes } from 'node:crypto'
import { db, transaction } from '../db/connection.js'
import { config } from '../config.js'
import { badRequest, unauthorized } from '../lib/errors.js'
import { normalizeEmail } from '../lib/normalize.js'
import { hashPassword, hashToken, verifyPassword } from '../lib/password.js'

const COOKIE_NAME = 'bulk_mail_session'
const SESSION_DAYS = 30
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

function sessionCookie(token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
  ]
  if (config.isProd) parts.push('Secure')
  return parts.join('; ')
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, entry) => {
    const idx = entry.indexOf('=')
    if (idx === -1) return acc
    const key = entry.slice(0, idx).trim()
    const value = entry.slice(idx + 1).trim()
    if (key) acc[key] = decodeURIComponent(value)
    return acc
  }, {})
}

function sanitizeUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function bootstrapPassword() {
  return process.env.DEFAULT_ADMIN_PASSWORD || (config.isProd ? null : 'admin12345')
}

export function ensureBootstrapAdmin() {
  const existing = db.prepare(`SELECT id, password_hash FROM users ORDER BY id LIMIT 1`).get()
  const email = normalizeEmail(process.env.DEFAULT_ADMIN_EMAIL || 'admin@swiftgrowthdigital.com')
  const password = bootstrapPassword()

  if (existing) {
    if (!existing.password_hash && password) {
      db.prepare(`UPDATE users SET password_hash = ?, email = COALESCE(email, ?), updated_at = datetime('now') WHERE id = ?`)
        .run(hashPassword(password), email, existing.id)
    }
    return
  }

  if (!password) {
    return
  }

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')`
  ).run('Administrator', email, hashPassword(password))
}

export function getUserById(id) {
  return db.prepare(`SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?`).get(id) || null
}

export function authenticate(email, password) {
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalizeEmail(email))
  if (!user || !user.password_hash) throw unauthorized('Invalid email or password')
  if (!verifyPassword(password, user.password_hash)) throw unauthorized('Invalid email or password')

  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString().slice(0, 19).replace('T', ' ')

  db.prepare(
    `INSERT INTO sessions (session_token_hash, user_id, expires_at, last_seen_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run(tokenHash, user.id, expiresAt)

  return {
    user: sanitizeUser(user),
    token,
    cookie: sessionCookie(token),
  }
}

export function revokeSession(token) {
  if (!token) return { revoked: 0 }
  const tokenHash = hashToken(token)
  const result = db.prepare(
    `UPDATE sessions SET revoked_at = datetime('now') WHERE session_token_hash = ? AND revoked_at IS NULL`
  ).run(tokenHash)
  return { revoked: result.changes }
}

export function getSessionUser(req) {
  const cookies = parseCookies(req.headers.cookie || '')
  const token = cookies[COOKIE_NAME]
  if (!token) return null
  const tokenHash = hashToken(token)
  const row = db.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')
     LIMIT 1`
  ).get(tokenHash)
  if (!row) return null
  db.prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE session_token_hash = ?`).run(tokenHash)
  return sanitizeUser(row)
}

export function requireAuth(req, _res, next) {
  const user = getSessionUser(req)
  if (!user) return next(unauthorized('Authentication required'))
  req.user = user
  next()
}

export function optionalAuth(req, _res, next) {
  req.user = getSessionUser(req)
  next()
}

export function loginPayload(input) {
  const auth = authenticate(input.email, input.password)
  return { user: auth.user, cookie: auth.cookie }
}

export function logoutPayload(req) {
  const cookies = parseCookies(req.headers.cookie || '')
  const token = cookies[COOKIE_NAME]
  return revokeSession(token)
}

export function listUsers() {
  return db.prepare(`SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id`).all().map(sanitizeUser)
}

export function createUser(input) {
  return transaction(() => {
    const email = normalizeEmail(input.email)
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email)
    if (existing) throw badRequest('User already exists')
    const id = db.prepare(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`
    ).run(input.name, email, hashPassword(input.password), input.role || 'viewer').lastInsertRowid
    return sanitizeUser(getUserById(id))
  })
}

ensureBootstrapAdmin()

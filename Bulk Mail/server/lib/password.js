import { randomBytes, pbkdf2Sync, timingSafeEqual, createHash } from 'node:crypto'

const ITERATIONS = 210000
const KEYLEN = 64
const DIGEST = 'sha512'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(String(password), salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false
  const [scheme, iterations, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) return false
  const next = pbkdf2Sync(String(password), salt, Number(iterations), KEYLEN, DIGEST)
  const expected = Buffer.from(hash, 'hex')
  return expected.length === next.length && timingSafeEqual(expected, next)
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

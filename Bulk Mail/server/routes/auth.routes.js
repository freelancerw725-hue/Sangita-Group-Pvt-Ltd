import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import { z } from 'zod'
import { loginPayload, logoutPayload, getSessionUser } from '../services/auth.service.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1).max(200),
})

router.get('/auth/me', asyncHandler(async (req, res) => {
  ok(res, { user: getSessionUser(req) })
}))

router.post('/auth/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const payload = loginPayload(req.validatedBody)
  res.setHeader('Set-Cookie', payload.cookie)
  ok(res, { user: payload.user })
}))

router.post('/auth/logout', asyncHandler(async (req, res) => {
  logoutPayload(req)
  res.setHeader('Set-Cookie', 'bulk_mail_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0')
  ok(res, { ok: true })
}))

export default router

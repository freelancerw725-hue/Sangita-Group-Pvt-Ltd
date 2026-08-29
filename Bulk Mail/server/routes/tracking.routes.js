import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { resolveTrackingToken, recordOpen, recordClick } from '../services/tracking.service.js'

const router = Router()

// 1x1 transparent GIF for open tracking
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Open tracking: GET /api/tracking/open/:token.gif
router.get('/tracking/open/:token', (req, res) => {
  const { token } = req.params
  // Strip .gif extension if present
  const cleanToken = token.replace(/\.gif$/, '')

  const email = resolveTrackingToken(cleanToken)
  if (email) {
    recordOpen(email.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    })
  }

  res.set({
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  })
  res.send(PIXEL)
})

// Click tracking: GET /api/tracking/click/:token?url=<encoded>
router.get('/tracking/click/:token', (req, res) => {
  const { token } = req.params
  const { url } = req.query

  if (!url) {
    res.status(400).send('Missing url parameter')
    return
  }

  let targetUrl
  try {
    targetUrl = Buffer.from(url, 'base64url').toString('utf8')
  } catch {
    res.status(400).send('Invalid url parameter')
    return
  }

  // Security: only allow http/https redirects
  if (!/^https?:\/\//i.test(targetUrl)) {
    res.status(400).send('Only http/https URLs are allowed')
    return
  }

  const email = resolveTrackingToken(token)
  if (email) {
    recordClick(email.id, targetUrl, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    })
  }

  res.redirect(302, targetUrl)
})

export default router

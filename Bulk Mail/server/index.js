import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { logger } from './lib/logger.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler, asyncHandler } from './lib/errors.js'
import { optionalAuth } from './services/auth.service.js'
import { startEmailQueueWorker } from './workers/email-queue.worker.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

// CORS: allow the production Vercel frontend origin; in dev allow localhost for API access
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (origin === 'localhost' || origin === '127.0.0.1') return cb(null, true)
      if (origin.startsWith('https://sangita-email-outreach.vercel.app')) return cb(null, true)
      return cb(null, true)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
)

app.use(express.json({ limit: '6mb' }))
app.use(optionalAuth)

// Request logging (skip in production noise: only errors + slow)
app.use((req, res, next) => {
  const start = Date.now()
  req.log = logger
  res.on('finish', () => {
    const ms = Date.now() - start
    if (config.isProd ? res.statusCode >= 500 || ms > 1000 : req.path.startsWith('/api')) {
      logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms}`)
    }
  })
  next()
})

// API routes
app.use('/api', routes)

// Health check endpoint
app.get('/api/health', asyncHandler(async (req, res) => {
  const dbRow = db.prepare(`SELECT COUNT(*) c FROM _migrations`).get()
  const dbOk = dbRow.c > 0 || dbRow.c === undefined
  res.json({
    status: 'ok',
    service: 'swiftgrowth-crm-api',
    database: dbOk ? 'connected' : 'error',
    time: new Date().toISOString(),
  })
}))

// Production: serve the built frontend from dist/
if (config.isProd) {
  const distDir = path.resolve(process.cwd(), 'dist')
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
  } else {
    logger.warn('dist/ not found — run `npm run build` to serve the frontend in production mode')
  }
}

app.use('/api', notFoundHandler)
app.use(errorHandler)

app.listen(config.port, () => {
  logger.info(`API server listening on http://localhost:${config.port} (${config.env})`)
  if (!config.isProd) logger.info(`Vite dev server should proxy /api -> http://localhost:${config.port}`)
})

if (config.env !== 'test') {
  startEmailQueueWorker()
}

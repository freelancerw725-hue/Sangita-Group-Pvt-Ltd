import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT_DIR = path.resolve(__dirname, '..')

// Load .env from project root (no extra dependency needed on Node >= 20.12)
const envFile = path.join(ROOT_DIR, '.env')
if (fs.existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile)
  } catch {
    // ignore malformed lines; defaults below still apply
  }
} else {
  // Fallback: try loading from current working directory
  try {
    process.loadEnvFile(path.join(process.cwd(), '.env'))
  } catch {}
}

const env = process.env

export const config = {
  env: env.NODE_ENV || 'development',
  isProd: (env.NODE_ENV || 'development') === 'production',

  port: Number(env.PORT || 3001),
  appUrl: env.APP_URL || 'https://sangita-email-outreach.vercel.app',

  dbPath: path.isAbsolute(env.DB_PATH || '')
    ? env.DB_PATH
    : path.join(ROOT_DIR, env.DB_PATH || 'server/data/crm.db'),
  dbVerbose: env.DB_VERBOSE === 'true',

  logLevel: env.LOG_LEVEL || 'info',
  logDir: path.isAbsolute(env.LOG_DIR || '')
    ? env.LOG_DIR
    : path.join(ROOT_DIR, env.LOG_DIR || 'logs'),

  queueWorkerIntervalMs: Number(env.QUEUE_WORKER_INTERVAL_MS || 5000),
  queueWorkerLimit: Number(env.QUEUE_WORKER_LIMIT || 5),
}

import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[config.logLevel] ?? LEVELS.info

let stream = null
function fileStream() {
  if (!config.isProd) return null
  try {
    fs.mkdirSync(config.logDir, { recursive: true })
    return fs.createWriteStream(path.join(config.logDir, 'app.log'), { flags: 'a' })
  } catch {
    return null
  }
}
const out = fileStream()

function write(level, args) {
  if (LEVELS[level] < threshold) return
  const ts = new Date().toISOString()
  const line = [`[${ts}]`, `[${level.toUpperCase()}]`, ...args.map(stringify)]
  const text = line.join(' ')
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](text)
  if (out) out.write(text + '\n')
}

function stringify(a) {
  if (a instanceof Error) return a.stack || a.message
  if (typeof a === 'object' && a !== null) {
    try { return JSON.stringify(a) } catch { return String(a) }
  }
  return String(a)
}

export const logger = {
  debug: (...a) => write('debug', a),
  info: (...a) => write('info', a),
  warn: (...a) => write('warn', a),
  error: (...a) => write('error', a),
}

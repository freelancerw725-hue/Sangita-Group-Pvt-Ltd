import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { config } from '../config.js'
import { logger } from '../lib/logger.js'

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })

export const db = new DatabaseSync(config.dbPath)

// Production-ready pragmas
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')
db.exec('PRAGMA busy_timeout = 5000;')
db.exec('PRAGMA synchronous = NORMAL;')

if (config.dbVerbose) {
  db.exec('PRAGMA foreign_keys = ON;')
}

/** Run fn inside a transaction; rolls back on throw. */
export function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r) => r.name)
  )
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    transaction(() => {
      db.exec(sql) // exec runs multi-statement scripts; prepare() would only run the first
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    })
    logger.info(`migration applied: ${file}`)
  }
}

// Run migrations automatically on import so the API is always ready.
migrate()

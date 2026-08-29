// Standalone migration runner (migrations also auto-run on server start)
import './connection.js'
import { logger } from '../lib/logger.js'
import { ensureBootstrapAdmin } from '../services/auth.service.js'

ensureBootstrapAdmin()
logger.info('Migrations up to date.')

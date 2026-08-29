import { config } from '../config.js'
import { logger } from '../lib/logger.js'
import { processQueueTick } from '../services/campaign-execution.service.js'

let timer = null
let running = false

export function startEmailQueueWorker() {
  if (timer) return stopEmailQueueWorker
  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await processQueueTick({ limit: config.queueWorkerLimit })
      if (result.processed > 0) {
        logger.info(`email queue processed: ${result.processed}`)
      }
    } catch (error) {
      logger.error('email queue worker failed', error)
    } finally {
      running = false
    }
  }
  timer = setInterval(tick, config.queueWorkerIntervalMs)
  timer.unref?.()
  tick()
  logger.info(`email queue worker started (${config.queueWorkerIntervalMs}ms)`)
  return stopEmailQueueWorker
}

export function stopEmailQueueWorker() {
  if (timer) clearInterval(timer)
  timer = null
  running = false
}

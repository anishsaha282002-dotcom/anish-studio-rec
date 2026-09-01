import { log } from '../logger.js'
import { dueScheduledDrafts } from '../store/db.js'
import { runPublish } from '../bot/index.js'

const TICK_MS = 30_000
let running = false

/**
 * Releases posts that were approved earlier with a delay. Nothing enters this
 * queue without a human tap — a scheduled post is a *deferred approved* post,
 * never an autonomous one.
 */
export function startScheduler(): NodeJS.Timeout {
  return setInterval(async () => {
    if (running) return
    running = true
    try {
      for (const draft of dueScheduledDrafts()) {
        log.info({ draftId: draft.id }, 'releasing scheduled draft')
        await runPublish(null, draft)
      }
    } catch (err) {
      log.error({ err }, 'scheduler tick failed')
    } finally {
      running = false
    }
  }, TICK_MS)
}

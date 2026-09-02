import { log } from '../logger.js'
import { deliverScheduledDailyPosts } from '../bot/daily-post.js'

const TICK_MS = 60_000
let running = false

/** Checks once per minute whether it is time to send today's post. */
export function startDailyScheduler(): NodeJS.Timeout {
  return setInterval(async () => {
    if (running) return
    running = true
    try {
      await deliverScheduledDailyPosts()
    } catch (err) {
      log.error({ err }, 'daily scheduler tick failed')
    } finally {
      running = false
    }
  }, TICK_MS)
}

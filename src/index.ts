import { config } from './config.js'
import { log } from './logger.js'
import { isGenerateConfigured } from './generate/caption.js'
import { bot } from './bot/client.js'
import { startDailyScheduler } from './queue/daily.js'
import { startScheduler } from './queue/scheduler.js'
import { connectedPlatforms } from './publishers/registry.js'

async function main(): Promise<void> {
  const connected = connectedPlatforms()

  log.info(
    {
      dryRun: config.DRY_RUN,
      connected,
      owners: config.TELEGRAM_OWNER_IDS.length,
      aiGenerate: isGenerateConfigured(),
      dailyPost: config.DAILY_POST_ENABLED,
      dailyHour: config.DAILY_POST_HOUR,
      dailyTimezone: config.DAILY_POST_TIMEZONE,
      geminiKeyPrefix: config.GEMINI_API_KEY ? config.GEMINI_API_KEY.slice(0, 4) : 'none',
    },
    'starting',
  )

  if (!config.DRY_RUN) {
    log.warn('DRY_RUN is OFF — posts will go to live accounts')
  }

  const timer = startScheduler()
  const dailyTimer = startDailyScheduler()

  const stop = async (signal: string) => {
    log.info({ signal }, 'shutting down')
    clearInterval(timer)
    clearInterval(dailyTimer)
    await bot.stop()
    process.exit(0)
  }
  process.once('SIGINT', () => void stop('SIGINT'))
  process.once('SIGTERM', () => void stop('SIGTERM'))

  await bot.start({
    onStart: (me) => log.info({ username: me.username }, 'bot online'),
  })
}

main().catch((err) => {
  log.error({ err }, 'fatal')
  process.exit(1)
})

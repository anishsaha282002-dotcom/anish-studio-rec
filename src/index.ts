import { config } from './config.js'
import { log } from './logger.js'
import { bot } from './bot/index.js'
import { startScheduler } from './queue/scheduler.js'
import { connectedPlatforms } from './publishers/registry.js'

async function main(): Promise<void> {
  const connected = connectedPlatforms()

  log.info(
    { dryRun: config.DRY_RUN, connected, owners: config.TELEGRAM_OWNER_IDS.length },
    'starting',
  )

  if (!config.DRY_RUN) {
    log.warn('DRY_RUN is OFF — posts will go to live accounts')
  }

  const timer = startScheduler()

  const stop = async (signal: string) => {
    log.info({ signal }, 'shutting down')
    clearInterval(timer)
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

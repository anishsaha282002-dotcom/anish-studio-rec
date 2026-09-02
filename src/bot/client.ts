import { Bot } from 'grammy'
import { config } from '../config.js'
import { log } from '../logger.js'

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN)

/** Owner allowlist. Everything else is dropped without a reply. */
bot.use(async (ctx, next) => {
  const id = ctx.from?.id
  if (id === undefined || !config.TELEGRAM_OWNER_IDS.includes(id)) {
    log.warn({ from: id, username: ctx.from?.username }, 'dropped update from non-owner')
    return
  }
  await next()
})

bot.catch((err) => {
  log.error({ err: err.error, update: err.ctx.update.update_id }, 'handler threw')
})

import { InlineKeyboard, InputFile } from 'grammy'
import { config } from '../config.js'
import { log } from '../logger.js'
import { isGenerateConfigured } from '../generate/caption.js'
import { generatePost } from '../generate/post.js'
import { markDailyDelivered, wasDailyDelivered } from '../store/daily.js'
import { bot } from './client.js'
import { esc } from './card.js'

function buildDailyPrompt(basePrompt: string): string {
  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: config.DAILY_POST_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return [
    basePrompt.trim(),
    '',
    `Today is ${today}. Create a fresh, unique social media post for today.`,
    'Make it feel timely and not repetitive.',
  ]
    .filter(Boolean)
    .join('\n')
}

function dailyHeader(): string {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: config.DAILY_POST_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
  return `📅 *Daily post — ${esc(label)}*`
}

/**
 * Generate an image + caption and send it for manual posting.
 * No social APIs involved — save the image and copy the caption yourself.
 */
export async function deliverDailyPost(
  ownerId: number,
  chatId: number,
  options: { prompt?: string; recordRun?: boolean } = {},
): Promise<void> {
  if (!isGenerateConfigured()) {
    await bot.api.sendMessage(
      chatId,
      'Daily posts need GEMINI_API_KEY in .env\nFree key: aistudio.google.com/apikey',
    )
    return
  }

  const basePrompt = options.prompt ?? config.DAILY_POST_PROMPT
  if (!basePrompt.trim()) {
    await bot.api.sendMessage(
      chatId,
      'Set DAILY_POST_PROMPT in .env — describe your brand or what you post about.',
    )
    return
  }

  const prompt = buildDailyPrompt(basePrompt)

  const thinking = await bot.api.sendMessage(chatId, '✨ Making today\'s post…')

  try {
    const post = await generatePost(prompt)

    await bot.api.sendPhoto(chatId, new InputFile(post.buffer, 'daily-post.png'), {
      caption: `${dailyHeader()}\n\n_Save this image — caption is in the next message_`,
      parse_mode: 'MarkdownV2',
    })

    const kb = new InlineKeyboard().text('🔄 Regenerate', `daily:regen:${ownerId}`)

    // Store caption for regenerate callback (Telegram callback data is max 64 bytes)
    pendingCaptions.set(ownerId, post.caption)

    await bot.api.sendMessage(
      chatId,
      [
        '📋 *Caption — copy and paste into your socials:*',
        '',
        esc(post.caption),
        '',
        '_Save the image above, paste this caption, post manually on Instagram/TikTok/etc\\._',
      ].join('\n'),
      { parse_mode: 'MarkdownV2', reply_markup: kb },
    )

    if (options.recordRun) {
      markDailyDelivered(ownerId)
    }

    await bot.api.deleteMessage(chatId, thinking.message_id).catch(() => {})
    log.info({ ownerId, chatId }, 'daily post delivered')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await bot.api
      .editMessageText(chatId, thinking.message_id, `❌ ${msg}`)
      .catch(() => bot.api.sendMessage(chatId, `❌ ${msg}`))
    log.error({ err, ownerId }, 'daily post failed')
  }
}

/** Captions keyed by owner — callback data is too small to hold full captions. */
export const pendingCaptions = new Map<number, string>()

export async function deliverScheduledDailyPosts(): Promise<void> {
  if (!config.DAILY_POST_ENABLED) return
  if (!isGenerateConfigured()) return
  if (!config.DAILY_POST_PROMPT.trim()) return

  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: config.DAILY_POST_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  )

  if (hour !== config.DAILY_POST_HOUR) return

  for (const ownerId of config.TELEGRAM_OWNER_IDS) {
    if (wasDailyDelivered(ownerId)) continue
    // In private chats, chat id equals user id.
    await deliverDailyPost(ownerId, ownerId, { recordRun: true })
  }
}

import { Bot, InlineKeyboard, InputFile, type Context } from 'grammy'
import { config } from '../config.js'
import { log } from '../logger.js'
import { isGenerateConfigured } from '../generate/caption.js'
import { generatePost } from '../generate/post.js'
import { connectedPlatforms, publishAll, publishers } from '../publishers/registry.js'
import {
  activeDraft,
  createDraft,
  getDraft,
  recordResults,
  scheduledDrafts,
  stats,
  updateDraft,
} from '../store/db.js'
import { PLATFORMS, PLATFORM_LABEL, type Draft, type MediaAsset, type PlatformId } from '../types.js'
import { cardKeyboard, esc, renderCard, renderResults, retryKeyboard } from './card.js'

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

/** Owners who tapped ✏️ Caption and whose next text message is the new caption. */
const awaitingCaption = new Map<number, number>()

/** AI-generated caption waiting to be applied to the next photo/video. */
const pendingGeneratedCaption = new Map<number, string>()
/** Last prompt per owner — used by Regenerate button. */
const lastGeneratePrompt = new Map<number, string>()

async function sendCard(ctx: Context, draft: Draft): Promise<void> {
  const text = renderCard(draft)
  const reply_markup = cardKeyboard(draft)
  const opts = { parse_mode: 'MarkdownV2' as const, reply_markup }

  const msg =
    draft.asset.kind === 'video'
      ? await ctx.replyWithVideo(draft.asset.fileId, { caption: text, ...opts })
      : await ctx.replyWithPhoto(draft.asset.fileId, { caption: text, ...opts })

  updateDraft(draft.id, { cardMessageId: msg.message_id })
}

async function refreshCard(ctx: Context, draft: Draft): Promise<void> {
  try {
    await ctx.editMessageCaption({
      caption: renderCard(draft),
      parse_mode: 'MarkdownV2',
      reply_markup: cardKeyboard(draft),
    })
  } catch (err) {
    // Telegram rejects an edit that produces identical content. Harmless.
    log.debug({ err }, 'card edit skipped')
  }
}

// ── Commands ─────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  await ctx.reply(
    [
      '*Social Command Center*',
      '',
      'Send me a video or photo to start a draft\\.',
      '',
      '/generate \\<prompt\\> — AI makes a full post \\(image \\+ caption\\)',
      '/status — what is connected',
      '/queue — scheduled posts',
      '/cancel — abort the current draft',
    ].join('\n'),
    { parse_mode: 'MarkdownV2' },
  )
})

bot.command('status', async (ctx) => {
  const s = stats()
  const conn = connectedPlatforms()
  const lines = [
    `*Status*  ${config.DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE'}`,
    '',
    ...PLATFORMS.map(
      (p) => `${conn.includes(p) ? '🟢' : '⚪️'} ${esc(PLATFORM_LABEL[p])}`,
    ),
    '',
    `${isGenerateConfigured() ? '🟢' : '⚪️'} AI generate \\(/generate\\)`,
    '',
    `drafts ${s.drafts} · published ${s.published} · failed ${s.failed} · queued ${s.queued}`,
  ]
  await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2' })
})

bot.command('queue', async (ctx) => {
  const items = scheduledDrafts(ctx.from!.id)
  if (items.length === 0) {
    await ctx.reply('Queue is empty\\.', { parse_mode: 'MarkdownV2' })
    return
  }
  for (const d of items) {
    await ctx.reply(
      `*\\#${d.id}* — ${esc(new Date(d.scheduledFor!).toUTCString())}\n${esc(d.caption.slice(0, 120))}`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: new InlineKeyboard().text('❌ Cancel', `act:kill:${d.id}`),
      },
    )
  }
})

bot.command('cancel', async (ctx) => {
  const d = activeDraft(ctx.from!.id)
  if (!d) {
    awaitingCaption.delete(ctx.from!.id)
    pendingGeneratedCaption.delete(ctx.from!.id)
    await ctx.reply('Nothing in progress\\.', { parse_mode: 'MarkdownV2' })
    return
  }
  updateDraft(d.id, { state: 'killed' })
  awaitingCaption.delete(ctx.from!.id)
  pendingGeneratedCaption.delete(ctx.from!.id)
  await ctx.reply(`Draft \\#${d.id} discarded\\.`, { parse_mode: 'MarkdownV2' })
})

async function runGenerate(ctx: Context, prompt: string): Promise<void> {
  if (!isGenerateConfigured()) {
    await ctx.reply(
      'Add GEMINI\\_API\\_KEY to your \\.env file first\\.\nFree key: aistudio\\.google\\.com/apikey',
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  const ownerId = ctx.from!.id
  lastGeneratePrompt.set(ownerId, prompt)
  const thinking = await ctx.reply('✨ Generating post \\(caption \\+ image\\)…')

  try {
    const post = await generatePost(prompt)

    const draft = createDraft(
      ownerId,
      ctx.chat!.id,
      {
        kind: 'photo',
        fileId: 'pending',
        bytes: post.buffer.length,
        width: post.width,
        height: post.height,
        mimeType: 'image/png',
      },
      connectedPlatforms(),
    )
    updateDraft(draft.id, { caption: post.caption, state: 'ready' })

    const fresh = getDraft(draft.id)!
    const msg = await ctx.replyWithPhoto(new InputFile(post.buffer, 'post.png'), {
      caption: renderCard(fresh),
      parse_mode: 'MarkdownV2',
      reply_markup: cardKeyboard(fresh),
    })

    const photo = msg.photo[msg.photo.length - 1]!
    updateDraft(draft.id, {
      cardMessageId: msg.message_id,
      asset: {
        kind: 'photo',
        fileId: photo.file_id,
        bytes: photo.file_size ?? post.buffer.length,
        width: photo.width,
        height: photo.height,
        mimeType: 'image/png',
      },
    })

    await ctx.api.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {})
    pendingGeneratedCaption.delete(ownerId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `❌ ${esc(msg)}`, {
      parse_mode: 'MarkdownV2',
    })
  }
}

bot.command('generate', async (ctx) => {
  const prompt = (ctx.message?.text ?? '').replace(/^\/generate(@\w+)?\s*/i, '').trim()
  if (!prompt) {
    await ctx.reply(
      'Usage: /generate \\<your prompt\\>\n\nExample:\n/generate Exciting post about my new coffee shop opening downtown',
      { parse_mode: 'MarkdownV2' },
    )
    return
  }
  await runGenerate(ctx, prompt)
})

bot.command('gen', async (ctx) => {
  const prompt = (ctx.message?.text ?? '').replace(/^\/gen(@\w+)?\s*/i, '').trim()
  if (!prompt) {
    await ctx.reply('Usage: /gen \\<your prompt\\>', { parse_mode: 'MarkdownV2' })
    return
  }
  await runGenerate(ctx, prompt)
})

// ── Media intake ─────────────────────────────────────────────────────────────

async function startDraft(ctx: Context, asset: MediaAsset, caption: string): Promise<void> {
  const ownerId = ctx.from!.id
  const generated = pendingGeneratedCaption.get(ownerId)
  const finalCaption = caption || generated || ''
  if (generated && !caption) pendingGeneratedCaption.delete(ownerId)

  const draft = createDraft(ownerId, ctx.chat!.id, asset, connectedPlatforms())
  if (finalCaption) {
    updateDraft(draft.id, { caption: finalCaption, state: 'ready' })
  } else {
    awaitingCaption.set(ownerId, draft.id)
  }
  const fresh = getDraft(draft.id)!
  await sendCard(ctx, fresh)
  if (!finalCaption) {
    await ctx.reply('Now send me the caption as a normal message\\.', { parse_mode: 'MarkdownV2' })
  } else if (generated && !caption) {
    await ctx.reply('Used your generated caption\\. Edit or post when ready\\.', {
      parse_mode: 'MarkdownV2',
    })
  }
}

bot.on('message:video', async (ctx) => {
  const v = ctx.message.video
  await startDraft(
    ctx,
    {
      kind: 'video',
      fileId: v.file_id,
      bytes: v.file_size ?? 0,
      durationSec: v.duration,
      width: v.width,
      height: v.height,
      mimeType: v.mime_type,
    },
    ctx.message.caption ?? '',
  )
})

bot.on('message:photo', async (ctx) => {
  // Telegram sends several sizes; the last is the largest.
  const p = ctx.message.photo[ctx.message.photo.length - 1]!
  await startDraft(
    ctx,
    { kind: 'photo', fileId: p.file_id, bytes: p.file_size ?? 0, width: p.width, height: p.height },
    ctx.message.caption ?? '',
  )
})

bot.on('message:text', async (ctx) => {
  const ownerId = ctx.from.id
  const draftId = awaitingCaption.get(ownerId)
  if (draftId === undefined) return
  awaitingCaption.delete(ownerId)

  const draft = getDraft(draftId)
  if (!draft || draft.state === 'killed') return

  updateDraft(draftId, { caption: ctx.message.text, state: 'ready' })
  const fresh = getDraft(draftId)!

  if (fresh.cardMessageId) {
    await ctx.api
      .editMessageCaption(fresh.chatId, fresh.cardMessageId, {
        caption: renderCard(fresh),
        parse_mode: 'MarkdownV2',
        reply_markup: cardKeyboard(fresh),
      })
      .catch((err) => log.debug({ err }, 'caption card edit failed'))
  }
})

// ── Buttons ──────────────────────────────────────────────────────────────────

bot.callbackQuery(/^plat:(\w+):(\d+)$/, async (ctx) => {
  const [, platform, idStr] = ctx.match as unknown as [string, PlatformId, string]
  const draft = getDraft(Number(idStr))
  if (!draft) return void (await ctx.answerCallbackQuery('Draft is gone.'))

  const next = draft.platforms.includes(platform)
    ? draft.platforms.filter((p) => p !== platform)
    : [...draft.platforms, platform]

  updateDraft(draft.id, { platforms: next })
  await ctx.answerCallbackQuery(
    `${PLATFORM_LABEL[platform]} ${next.includes(platform) ? 'on' : 'off'}`,
  )
  await refreshCard(ctx, getDraft(draft.id)!)
})

bot.callbackQuery(/^act:(\w+):(\d+)$/, async (ctx) => {
  const [, verb, idStr] = ctx.match as unknown as [string, string, string]
  const id = Number(idStr)
  const draft = getDraft(id)
  if (!draft) return void (await ctx.answerCallbackQuery('Draft is gone.'))

  switch (verb) {
    case 'caption': {
      awaitingCaption.set(ctx.from.id, id)
      await ctx.answerCallbackQuery('Send the new caption')
      await ctx.reply('Send the new caption as a normal message\\.', { parse_mode: 'MarkdownV2' })
      return
    }

    case 'kill': {
      updateDraft(id, { state: 'killed' })
      await ctx.answerCallbackQuery('Killed')
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {})
      return
    }

    case 'sched': {
      const kb = new InlineKeyboard()
        .text('in 1h', `when:60:${id}`)
        .text('in 4h', `when:240:${id}`)
        .row()
        .text('tomorrow', `when:1440:${id}`)
      await ctx.answerCallbackQuery()
      await ctx.reply('When?', { reply_markup: kb })
      return
    }

    case 'post':
    case 'retry': {
      await ctx.answerCallbackQuery('Publishing…')
      await runPublish(ctx, draft)
      return
    }
  }
})

bot.callbackQuery(/^when:(\d+):(\d+)$/, async (ctx) => {
  const [, minsStr, idStr] = ctx.match as unknown as [string, string, string]
  const at = Date.now() + Number(minsStr) * 60_000
  updateDraft(Number(idStr), { state: 'scheduled', scheduledFor: at })
  await ctx.answerCallbackQuery('Scheduled')
  await ctx.editMessageText(`⏰ Scheduled for ${esc(new Date(at).toUTCString())}`, {
    parse_mode: 'MarkdownV2',
  })
})

bot.callbackQuery('gen:clear', async (ctx) => {
  pendingGeneratedCaption.delete(ctx.from.id)
  await ctx.answerCallbackQuery('Cleared')
  await ctx.editMessageText('Caption cleared\\. Send /generate to try again\\.', {
    parse_mode: 'MarkdownV2',
  })
})

bot.callbackQuery('gen:retry', async (ctx) => {
  const prompt = lastGeneratePrompt.get(ctx.from.id)
  if (!prompt) {
    await ctx.answerCallbackQuery('No prompt saved')
    return
  }
  await ctx.answerCallbackQuery('Regenerating…')
  await runGenerate(ctx, prompt)
})

// ── Publishing ───────────────────────────────────────────────────────────────

export async function runPublish(ctx: Context | null, draft: Draft): Promise<void> {
  const targets = draft.platforms.filter(
    (p) => publishers[p].validate(draft.asset, draft.caption).level !== 'block',
  )

  const results = await publishAll(targets, draft.asset, draft.caption)
  recordResults(draft.id, results, config.DRY_RUN)
  updateDraft(draft.id, { state: 'published' })

  const text = renderResults(draft, results, config.DRY_RUN)
  const kb = retryKeyboard(draft.id, results)

  if (ctx) {
    await ctx
      .editMessageCaption({ caption: text, parse_mode: 'MarkdownV2', reply_markup: kb })
      .catch(async () => {
        await ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: kb })
      })
  } else {
    await bot.api.sendMessage(draft.chatId, text, { parse_mode: 'MarkdownV2', reply_markup: kb })
  }
}

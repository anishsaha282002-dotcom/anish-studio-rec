import { InlineKeyboard } from 'grammy'
import { publishers } from '../publishers/registry.js'
import { PLATFORMS, PLATFORM_LABEL, type Draft, type PlatformId, type PublishResult } from '../types.js'

/** Escape every character MarkdownV2 treats as special. Missing one silently kills the send. */
export function esc(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => '\\' + c)
}

const BADGE = { ok: '✅', warn: '⚠️', block: '❌' } as const

export function renderCard(draft: Draft): string {
  const lines: string[] = []
  lines.push(`*Draft \\#${draft.id}*`)
  lines.push('')

  lines.push(draft.caption ? esc(draft.caption) : '_no caption yet_')
  lines.push('')

  if (draft.platforms.length === 0) {
    lines.push('_no platforms selected_')
  } else {
    for (const p of draft.platforms) {
      const pub = publishers[p]
      const v = pub.validate(draft.asset, draft.caption)
      const conn = pub.isConnected() ? '' : ' _\\(not connected\\)_'
      const notes = v.notes.length ? ` — ${esc(v.notes.join('; '))}` : ''
      lines.push(`${BADGE[v.level]} ${esc(PLATFORM_LABEL[p])}${conn}${notes}`)
    }
  }

  if (draft.scheduledFor) {
    lines.push('')
    lines.push(`⏰ scheduled for ${esc(new Date(draft.scheduledFor).toUTCString())}`)
  }

  const a = draft.asset
  const meta = [
    a.kind,
    a.durationSec ? `${a.durationSec}s` : null,
    a.width && a.height ? `${a.width}x${a.height}` : null,
    `${(a.bytes / (1024 * 1024)).toFixed(1)}MB`,
  ]
    .filter(Boolean)
    .join(' · ')
  lines.push('')
  lines.push(`_${esc(meta)}_`)

  return lines.join('\n')
}

export function cardKeyboard(draft: Draft): InlineKeyboard {
  const kb = new InlineKeyboard()

  // Platform toggles, two per row.
  PLATFORMS.forEach((p, i) => {
    const on = draft.platforms.includes(p)
    kb.text(`${on ? '🟢' : '⚪️'} ${PLATFORM_LABEL[p]}`, `plat:${p}:${draft.id}`)
    if (i % 2 === 1) kb.row()
  })
  kb.row()

  const blocked = draft.platforms.some(
    (p) => publishers[p].validate(draft.asset, draft.caption).level === 'block',
  )
  const ready = draft.platforms.length > 0 && draft.caption.length > 0 && !blocked

  if (ready) {
    kb.text('✅ Post now', `act:post:${draft.id}`)
    kb.text('⏰ Schedule', `act:sched:${draft.id}`)
    kb.row()
  }
  kb.text('✏️ Caption', `act:caption:${draft.id}`)
  kb.text('❌ Kill', `act:kill:${draft.id}`)

  return kb
}

export function renderResults(draft: Draft, results: PublishResult[], dryRun: boolean): string {
  const lines: string[] = []
  lines.push(`*Draft \\#${draft.id} — ${dryRun ? 'DRY RUN' : 'published'}*`)
  lines.push('')
  lines.push(esc(draft.caption))
  lines.push('')
  for (const r of results) {
    if (r.ok) {
      const link = r.permalink ? ` — [link](${r.permalink})` : ''
      lines.push(`✅ ${esc(PLATFORM_LABEL[r.platform])}${link}`)
    } else {
      lines.push(`❌ ${esc(PLATFORM_LABEL[r.platform])} — ${esc(r.error ?? 'unknown error')}`)
    }
  }
  if (dryRun) {
    lines.push('')
    lines.push('_DRY\\_RUN is on — nothing was actually posted\\._')
  }
  return lines.join('\n')
}

export function retryKeyboard(draftId: number, results: PublishResult[]): InlineKeyboard | undefined {
  const failed = results.filter((r) => !r.ok)
  if (failed.length === 0) return undefined
  return new InlineKeyboard().text(`🔁 Retry ${failed.length} failed`, `act:retry:${draftId}`)
}

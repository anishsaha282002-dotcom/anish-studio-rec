import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from '../config.js'
import type { Draft, MediaAsset, PlatformId, PublishResult, DraftState } from '../types.js'

mkdirSync(dirname(config.DB_PATH), { recursive: true })

export const db = new Database(config.DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS drafts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL,
  chat_id       INTEGER NOT NULL,
  card_msg_id   INTEGER,
  state         TEXT    NOT NULL,
  asset_json    TEXT    NOT NULL,
  caption       TEXT    NOT NULL DEFAULT '',
  platforms     TEXT    NOT NULL DEFAULT '',
  scheduled_for INTEGER,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id   INTEGER NOT NULL REFERENCES drafts(id),
  platform   TEXT    NOT NULL,
  ok         INTEGER NOT NULL,
  permalink  TEXT,
  error      TEXT,
  dry_run    INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_state     ON drafts(state);
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled ON drafts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_posts_draft      ON posts(draft_id);
`)

interface Row {
  id: number
  owner_id: number
  chat_id: number
  card_msg_id: number | null
  state: string
  asset_json: string
  caption: string
  platforms: string
  scheduled_for: number | null
  created_at: number
}

function toDraft(r: Row): Draft {
  return {
    id: r.id,
    ownerId: r.owner_id,
    chatId: r.chat_id,
    cardMessageId: r.card_msg_id ?? undefined,
    state: r.state as DraftState,
    asset: JSON.parse(r.asset_json) as MediaAsset,
    caption: r.caption,
    platforms: r.platforms ? (r.platforms.split(',') as PlatformId[]) : [],
    scheduledFor: r.scheduled_for ?? undefined,
    createdAt: r.created_at,
  }
}

export function createDraft(
  ownerId: number,
  chatId: number,
  asset: MediaAsset,
  platforms: PlatformId[],
): Draft {
  const info = db
    .prepare(
      `INSERT INTO drafts (owner_id, chat_id, state, asset_json, caption, platforms, created_at)
       VALUES (?, ?, 'awaiting_caption', ?, '', ?, ?)`,
    )
    .run(ownerId, chatId, JSON.stringify(asset), platforms.join(','), Date.now())
  return getDraft(Number(info.lastInsertRowid))!
}

export function getDraft(id: number): Draft | undefined {
  const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as Row | undefined
  return row ? toDraft(row) : undefined
}

/** The draft this owner is currently composing, if any. */
export function activeDraft(ownerId: number): Draft | undefined {
  const row = db
    .prepare(
      `SELECT * FROM drafts WHERE owner_id = ? AND state IN ('composing','awaiting_caption','ready')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(ownerId) as Row | undefined
  return row ? toDraft(row) : undefined
}

export function updateDraft(
  id: number,
  patch: Partial<
    Pick<Draft, 'state' | 'caption' | 'platforms' | 'cardMessageId' | 'scheduledFor' | 'asset'>
  >,
): void {
  const sets: string[] = []
  const vals: unknown[] = []
  if (patch.state !== undefined) (sets.push('state = ?'), vals.push(patch.state))
  if (patch.caption !== undefined) (sets.push('caption = ?'), vals.push(patch.caption))
  if (patch.platforms !== undefined) (sets.push('platforms = ?'), vals.push(patch.platforms.join(',')))
  if (patch.cardMessageId !== undefined) (sets.push('card_msg_id = ?'), vals.push(patch.cardMessageId))
  if (patch.scheduledFor !== undefined) (sets.push('scheduled_for = ?'), vals.push(patch.scheduledFor))
  if (patch.asset !== undefined) (sets.push('asset_json = ?'), vals.push(JSON.stringify(patch.asset)))
  if (sets.length === 0) return
  vals.push(id)
  db.prepare(`UPDATE drafts SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
}

export function dueScheduledDrafts(now = Date.now()): Draft[] {
  const rows = db
    .prepare(`SELECT * FROM drafts WHERE state = 'scheduled' AND scheduled_for <= ?`)
    .all(now) as Row[]
  return rows.map(toDraft)
}

export function scheduledDrafts(ownerId: number): Draft[] {
  const rows = db
    .prepare(
      `SELECT * FROM drafts WHERE owner_id = ? AND state = 'scheduled' ORDER BY scheduled_for ASC`,
    )
    .all(ownerId) as Row[]
  return rows.map(toDraft)
}

export function recordResults(draftId: number, results: PublishResult[], dryRun: boolean): void {
  const stmt = db.prepare(
    `INSERT INTO posts (draft_id, platform, ok, permalink, error, dry_run, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const tx = db.transaction((rs: PublishResult[]) => {
    for (const r of rs) {
      stmt.run(draftId, r.platform, r.ok ? 1 : 0, r.permalink ?? null, r.error ?? null, dryRun ? 1 : 0, Date.now())
    }
  })
  tx(results)
}

export function stats(): { drafts: number; published: number; failed: number; queued: number } {
  const one = (sql: string, ...p: unknown[]) =>
    (db.prepare(sql).get(...p) as { c: number }).c
  return {
    drafts: one('SELECT COUNT(*) c FROM drafts'),
    published: one('SELECT COUNT(*) c FROM posts WHERE ok = 1'),
    failed: one('SELECT COUNT(*) c FROM posts WHERE ok = 0'),
    queued: one("SELECT COUNT(*) c FROM drafts WHERE state = 'scheduled'"),
  }
}

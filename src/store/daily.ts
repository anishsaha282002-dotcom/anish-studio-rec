import { config } from '../config.js'
import { db } from './db.js'

db.exec(`
CREATE TABLE IF NOT EXISTS daily_runs (
  date_key  TEXT    NOT NULL,
  owner_id  INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (date_key, owner_id)
);
`)

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.DAILY_POST_TIMEZONE,
  }).format(new Date())
}

export function wasDailyDelivered(ownerId: number, dateKey = todayKey()): boolean {
  const row = db
    .prepare('SELECT 1 FROM daily_runs WHERE date_key = ? AND owner_id = ?')
    .get(dateKey, ownerId)
  return Boolean(row)
}

export function markDailyDelivered(ownerId: number, dateKey = todayKey()): void {
  db.prepare(
    'INSERT OR IGNORE INTO daily_runs (date_key, owner_id, created_at) VALUES (?, ?, ?)',
  ).run(dateKey, ownerId, Date.now())
}

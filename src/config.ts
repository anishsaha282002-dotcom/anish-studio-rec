import 'dotenv/config'
import { z } from 'zod'

const csvNumbers = z
  .string()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map(Number),
  )
  .refine((ns) => ns.every((n) => Number.isInteger(n) && n > 0), {
    message: 'TELEGRAM_OWNER_IDS must be comma-separated numeric Telegram user ids',
  })

const bool = z
  .string()
  .default('true')
  .transform((s) => s.toLowerCase() !== 'false')

const Schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20, 'Set TELEGRAM_BOT_TOKEN from @BotFather'),
  TELEGRAM_OWNER_IDS: csvNumbers,
  /** Legacy alias — some setups use CHAT_ID instead of OWNER_IDS */
  TELEGRAM_CHAT_ID: z.string().default(''),
  DRY_RUN: bool,
  LOG_LEVEL: z.string().default('info'),
  DB_PATH: z.string().default('./data/bot.db'),

  YOUTUBE_CLIENT_ID: z.string().default(''),
  YOUTUBE_CLIENT_SECRET: z.string().default(''),
  YOUTUBE_REFRESH_TOKEN: z.string().default(''),
  INSTAGRAM_USER_ID: z.string().default(''),
  INSTAGRAM_ACCESS_TOKEN: z.string().default(''),
  TIKTOK_CLIENT_KEY: z.string().default(''),
  TIKTOK_CLIENT_SECRET: z.string().default(''),
  TIKTOK_REFRESH_TOKEN: z.string().default(''),
  LINKEDIN_ACCESS_TOKEN: z.string().default(''),
  LINKEDIN_MEMBER_URN: z.string().default(''),
  X_API_KEY: z.string().default(''),
  X_ACCESS_TOKEN: z.string().default(''),

  MEDIA_PUBLIC_BASE_URL: z.string().default(''),
  S3_ENDPOINT: z.string().default(''),
  S3_BUCKET: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),

  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
})

const parsed = Schema.safeParse(process.env)

if (!parsed.success) {
  // Never print process.env here — it would dump every secret into the log.
  console.error('Invalid configuration:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('\nCopy .env.example to .env and fill it in.')
  process.exit(1)
}

let ownerIds = parsed.data.TELEGRAM_OWNER_IDS
if (ownerIds.length === 0 && parsed.data.TELEGRAM_CHAT_ID.trim()) {
  const id = Number(parsed.data.TELEGRAM_CHAT_ID.trim())
  if (Number.isInteger(id) && id > 0) ownerIds = [id]
}

export const config = { ...parsed.data, TELEGRAM_OWNER_IDS: ownerIds }

if (config.TELEGRAM_OWNER_IDS.length === 0) {
  console.error(
    'TELEGRAM_OWNER_IDS is empty. Refusing to start an unguarded bot — anyone who finds\n' +
      'the username could drive it. Message @userinfobot for your numeric id.',
  )
  process.exit(1)
}

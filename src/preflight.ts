import { config } from './config.js'
import { isGenerateConfigured } from './generate/caption.js'
import { isMediaHostingConfigured } from './media/storage.js'
import { connectedPlatforms } from './publishers/registry.js'
import { PLATFORMS, PLATFORM_LABEL } from './types.js'

const connected = connectedPlatforms()

console.log(`\nmode: ${config.DRY_RUN ? 'DRY RUN (nothing posts to socials)' : '🔴 LIVE'}`)
console.log(`owners: ${config.TELEGRAM_OWNER_IDS.join(', ') || '(none — bot will refuse to start)'}\n`)

for (const p of PLATFORMS) {
  console.log(`  ${connected.includes(p) ? '✅' : '⬜'}  ${PLATFORM_LABEL[p]}`)
}

console.log(`  ${isMediaHostingConfigured() ? '✅' : '⬜'}  Media hosting (S3 + MEDIA_PUBLIC_BASE_URL)`)
console.log(`  ${isGenerateConfigured() ? '✅' : '⬜'}  AI post generation (/generate)`)
console.log('')

if (config.DRY_RUN) {
  console.log('DRY_RUN is ON — the bot responds and simulates posts, but nothing hits your socials.')
  console.log('Set DRY_RUN=false once Instagram credentials and media hosting are configured.\n')
}

if (!isMediaHostingConfigured()) {
  console.log('Media hosting not configured — required for live Instagram posts.')
  console.log('Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, MEDIA_PUBLIC_BASE_URL.\n')
}

if (connected.length === 0) {
  console.log('No social platforms connected yet — add credentials to .env when ready.')
  console.log('You can still test the full flow in dry-run mode.\n')
}

process.exit(0)

import { config } from './config.js'
import { isGenerateConfigured } from './generate/caption.js'
import { isMediaHostingConfigured } from './media/storage.js'
import { connectedPlatforms } from './publishers/registry.js'
import { PLATFORMS, PLATFORM_LABEL } from './types.js'

const connected = connectedPlatforms()

console.log(`\nmode: ${config.DRY_RUN ? 'DRY RUN (auto-posting disabled)' : '🔴 LIVE auto-posting'}`)
console.log(`owners: ${config.TELEGRAM_OWNER_IDS.join(', ') || '(none — bot will refuse to start)'}\n`)

console.log('  Daily posts (recommended):')
console.log(
  `  ${config.DAILY_POST_ENABLED && isGenerateConfigured() && config.DAILY_POST_PROMPT.trim() ? '✅' : '⬜'}  Auto daily post at ${config.DAILY_POST_HOUR}:00 ${config.DAILY_POST_TIMEZONE}`,
)
console.log(`  ${isGenerateConfigured() ? '✅' : '⬜'}  GEMINI_API_KEY (free from aistudio.google.com/apikey)`)
console.log(`  ${config.DAILY_POST_PROMPT.trim() ? '✅' : '⬜'}  DAILY_POST_PROMPT (describe your brand)`)
console.log('')

for (const p of PLATFORMS) {
  console.log(`  ${connected.includes(p) ? '✅' : '⬜'}  ${PLATFORM_LABEL[p]} auto-post`)
}

console.log(`  ${isMediaHostingConfigured() ? '✅' : '⬜'}  Media hosting (only needed for auto-posting)`)
console.log('')

if (!isGenerateConfigured() || !config.DAILY_POST_PROMPT.trim()) {
  console.log('Quick start for daily posts:')
  console.log('  1. Set GEMINI_API_KEY (free)')
  console.log('  2. Set DAILY_POST_PROMPT — e.g. "Posts for my coffee shop downtown"')
  console.log('  3. npm run dev → message bot /daily to test')
  console.log('')
}

if (config.DAILY_POST_ENABLED && isGenerateConfigured() && config.DAILY_POST_PROMPT.trim()) {
  console.log(`Daily posts ON — bot will DM you at ${config.DAILY_POST_HOUR}:00 ${config.DAILY_POST_TIMEZONE}.`)
  console.log('Save the image, copy the caption, post to Instagram/TikTok yourself.\n')
}

process.exit(0)

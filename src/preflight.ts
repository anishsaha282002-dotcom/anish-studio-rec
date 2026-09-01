import { config } from './config.js'
import { connectedPlatforms } from './publishers/registry.js'
import { PLATFORMS, PLATFORM_LABEL } from './types.js'

const connected = connectedPlatforms()

console.log(`\nmode: ${config.DRY_RUN ? 'DRY RUN (nothing posts)' : 'LIVE'}`)
console.log(`owners: ${config.TELEGRAM_OWNER_IDS.length}\n`)

for (const p of PLATFORMS) {
  console.log(`  ${connected.includes(p) ? '✅' : '⬜'}  ${PLATFORM_LABEL[p]}`)
}

console.log('')
if (connected.length === 0) {
  console.log('No platforms connected yet. That is expected until the approvals land —')
  console.log('the bot still runs, and dry-run publishing works end to end.\n')
}

process.exit(0)

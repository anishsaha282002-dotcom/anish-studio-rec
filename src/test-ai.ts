import { config } from './config.js'
import { isGenerateConfigured } from './generate/caption.js'
import { generateCaption } from './generate/caption.js'
import { generateImage, generateImagePrompt } from './generate/image.js'

console.log('\n=== AI test ===\n')

if (!isGenerateConfigured()) {
  console.log('❌ GEMINI_API_KEY is missing or empty in .env')
  console.log('   Get a free key: https://aistudio.google.com/apikey')
  console.log('   Key should start with AIza\n')
  process.exit(1)
}

const keyPreview = config.GEMINI_API_KEY.slice(0, 8) + '...'
console.log(`key: ${keyPreview} (starts with ${config.GEMINI_API_KEY.slice(0, 4)})`)
console.log(`model: ${config.GEMINI_MODEL}`)

if (!config.GEMINI_API_KEY.startsWith('AIza')) {
  console.log('\n⚠️  WARNING: Gemini keys from AI Studio usually start with "AIza"')
  console.log('   Your key might be wrong. Get a new one at aistudio.google.com/apikey\n')
}

try {
  console.log('\n1. Testing caption...')
  const caption = await generateCaption('Say hello in one short sentence')
  console.log('   ✅ Caption:', caption.slice(0, 80))

  console.log('\n2. Testing image prompt...')
  const imgPrompt = await generateImagePrompt('sunset beach')
  console.log('   ✅ Image prompt:', imgPrompt.slice(0, 80))

  console.log('\n3. Testing image download (free)...')
  const img = await generateImage(imgPrompt)
  console.log(`   ✅ Image: ${img.buffer.length} bytes`)

  console.log('\n✅ All AI tests passed. /generate should work in Telegram.\n')
} catch (err) {
  console.log('\n❌ FAILED:', err instanceof Error ? err.message : err)
  console.log('\nFix the error above, then restart: npm run dev\n')
  process.exit(1)
}

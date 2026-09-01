import { geminiText } from './gemini.js'
import { log } from '../logger.js'

const IMAGE_PROMPT_SYSTEM = `You write short image prompts for social media posts.
Return ONLY the image description (1-2 sentences). No quotes. Visual and specific. No text in the image.`

export async function generateImagePrompt(userPrompt: string): Promise<string> {
  return geminiText(userPrompt, IMAGE_PROMPT_SYSTEM)
}

/**
 * Free image generation via Pollinations (no API key, no cost).
 * Gemini writes the prompt; Pollinations renders the image.
 */
export async function generateImage(imagePrompt: string): Promise<{
  buffer: Buffer
  width: number
  height: number
}> {
  const width = 1024
  const height = 1792
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}` +
    `?width=${width}&height=${height}&nologo=true`

  const res = await fetch(url)
  if (!res.ok) {
    log.error({ status: res.status }, 'free image generation failed')
    throw new Error(`Image generation failed (HTTP ${res.status})`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 1000) {
    throw new Error('Image generation returned empty file — try again')
  }

  return { buffer, width, height }
}

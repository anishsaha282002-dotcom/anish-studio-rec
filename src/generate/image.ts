import { config } from '../config.js'
import { log } from '../logger.js'

const IMAGE_PROMPT_SYSTEM = `You write short DALL-E image prompts for social media posts.
Return ONLY the image description (1-2 sentences). No quotes. Visual, specific, no text-in-image requests.`

interface ChatResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

interface ImageResponse {
  data?: { url?: string; revised_prompt?: string }[]
  error?: { message?: string }
}

export async function generateImagePrompt(userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: IMAGE_PROMPT_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  })

  const data = (await res.json()) as ChatResponse
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI HTTP ${res.status}`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned empty image prompt')
  return text
}

/** Vertical 9:16-ish size for Instagram/TikTok/Reels. */
const IMAGE_SIZE = '1024x1792'

export async function generateImage(imagePrompt: string): Promise<{
  buffer: Buffer
  width: number
  height: number
}> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.OPENAI_IMAGE_MODEL,
      prompt: imagePrompt,
      n: 1,
      size: IMAGE_SIZE,
      response_format: 'url',
    }),
  })

  const data = (await res.json()) as ImageResponse
  if (!res.ok) {
    log.error({ status: res.status }, 'image generation failed')
    throw new Error(data.error?.message ?? `OpenAI images HTTP ${res.status}`)
  }

  const url = data.data?.[0]?.url
  if (!url) throw new Error('OpenAI returned no image URL')

  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Failed to download generated image (${imgRes.status})`)

  const buffer = Buffer.from(await imgRes.arrayBuffer())
  return { buffer, width: 1024, height: 1792 }
}

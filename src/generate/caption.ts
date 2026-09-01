import { config } from '../config.js'
import { log } from '../logger.js'

const SYSTEM = `You write social media post captions. Be engaging and natural.
Rules:
- Return ONLY the caption text, no quotes or explanation
- Include 3-5 relevant hashtags at the end when appropriate
- Keep under 2200 characters
- Match the tone the user asks for`

interface OpenAIResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

export function isGenerateConfigured(): boolean {
  return config.OPENAI_API_KEY.length > 0
}

export async function generateCaption(prompt: string): Promise<string> {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in .env')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.8,
    }),
  })

  const data = (await res.json()) as OpenAIResponse

  if (!res.ok) {
    const msg = data.error?.message ?? `OpenAI HTTP ${res.status}`
    log.error({ status: res.status }, 'caption generation failed')
    throw new Error(msg)
  }

  const caption = data.choices?.[0]?.message?.content?.trim()
  if (!caption) throw new Error('OpenAI returned empty caption')

  return caption.slice(0, 2200)
}

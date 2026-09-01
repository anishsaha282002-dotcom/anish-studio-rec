import { config } from '../config.js'
import { log } from '../logger.js'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

interface GeminiPart {
  text?: string
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[]
  error?: { message?: string; code?: number }
}

export function isGeminiConfigured(): boolean {
  return config.GEMINI_API_KEY.length > 0
}

/** Free Gemini text generation via Google AI Studio. */
export async function geminiText(
  userPrompt: string,
  systemInstruction?: string,
): Promise<string> {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in .env')
  }

  const url = `${GEMINI_BASE}/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as GeminiResponse

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `Gemini HTTP ${res.status}`
    log.error({ status: res.status }, 'gemini request failed')
    throw new Error(msg)
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  if (!text) throw new Error('Gemini returned empty text')
  return text
}

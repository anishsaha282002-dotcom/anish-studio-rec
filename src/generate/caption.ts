import { geminiText, isGeminiConfigured } from './gemini.js'

const SYSTEM = `You write social media post captions. Be engaging and natural.
Rules:
- Return ONLY the caption text, no quotes or explanation
- Include 3-5 relevant hashtags at the end when appropriate
- Keep under 2200 characters
- Match the tone the user asks for`

export function isGenerateConfigured(): boolean {
  return isGeminiConfigured()
}

export async function generateCaption(prompt: string): Promise<string> {
  const caption = await geminiText(prompt, SYSTEM)
  return caption.slice(0, 2200)
}

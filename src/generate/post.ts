import { generateCaption } from './caption.js'
import { generateImage, generateImagePrompt } from './image.js'

export interface GeneratedPost {
  caption: string
  buffer: Buffer
  width: number
  height: number
}

/** Caption + image in one shot. */
export async function generatePost(userPrompt: string): Promise<GeneratedPost> {
  const [caption, imagePrompt] = await Promise.all([
    generateCaption(userPrompt),
    generateImagePrompt(userPrompt),
  ])

  const image = await generateImage(imagePrompt)

  return {
    caption,
    buffer: image.buffer,
    width: image.width,
    height: image.height,
  }
}

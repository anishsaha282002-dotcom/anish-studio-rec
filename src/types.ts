export const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'] as const
export type PlatformId = (typeof PLATFORMS)[number]

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  x: 'X',
}

export type MediaKind = 'video' | 'photo'

export interface MediaAsset {
  kind: MediaKind
  /** Telegram file_id — how we re-send it and how we fetch bytes when publishing. */
  fileId: string
  /** Bytes, as reported by Telegram. */
  bytes: number
  durationSec?: number
  width?: number
  height?: number
  mimeType?: string
  /** Public HTTPS URL once uploaded to object storage. Instagram requires this. */
  publicUrl?: string
}

export type DraftState = 'composing' | 'awaiting_caption' | 'ready' | 'scheduled' | 'published' | 'killed'

export interface Draft {
  id: number
  ownerId: number
  chatId: number
  /** Message id of the approval card, so we can edit it in place. */
  cardMessageId?: number
  state: DraftState
  asset: MediaAsset
  caption: string
  platforms: PlatformId[]
  scheduledFor?: number
  createdAt: number
}

export type ValidationLevel = 'ok' | 'warn' | 'block'

export interface ValidationResult {
  level: ValidationLevel
  /** Short reasons, shown on the approval card. Empty when level is 'ok'. */
  notes: string[]
}

export interface PublishResult {
  platform: PlatformId
  ok: boolean
  permalink?: string
  error?: string
}

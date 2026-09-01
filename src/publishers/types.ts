import type { MediaAsset, PlatformId, PublishResult, ValidationResult } from '../types.js'

export interface VideoSpec {
  minSec: number
  maxSec: number
  maxBytes: number
  /** Human-readable, shown in validation notes. */
  aspect: string
}

export interface Capabilities {
  video: boolean
  photo: boolean
  maxCaption: number
  videoSpec?: VideoSpec
}

export interface Publisher {
  readonly id: PlatformId
  readonly capabilities: Capabilities
  /** False when the platform's credentials are absent from .env. Never throws. */
  isConnected(): boolean
  /** Cheap, pure, never throws. Runs before anything is uploaded or spent. */
  validate(asset: MediaAsset, caption: string): ValidationResult
  publish(asset: MediaAsset, caption: string): Promise<PublishResult>
}

export const MB = 1024 * 1024

/**
 * Shared validation every platform needs. Individual publishers layer their own
 * quirks on top of this.
 */
export function baseValidate(
  id: PlatformId,
  caps: Capabilities,
  asset: MediaAsset,
  caption: string,
): ValidationResult {
  const notes: string[] = []
  let level: ValidationResult['level'] = 'ok'

  const block = (m: string) => {
    notes.push(m)
    level = 'block'
  }
  const warn = (m: string) => {
    notes.push(m)
    if (level !== 'block') level = 'warn'
  }

  if (asset.kind === 'video' && !caps.video) block('does not accept video')
  if (asset.kind === 'photo' && !caps.photo) block('does not accept photos')

  if (caption.length > caps.maxCaption) {
    block(`caption ${caption.length} chars, max ${caps.maxCaption}`)
  }

  if (asset.kind === 'video' && caps.videoSpec) {
    const s = caps.videoSpec
    if (asset.durationSec !== undefined) {
      if (asset.durationSec < s.minSec) block(`${asset.durationSec}s is under the ${s.minSec}s minimum`)
      if (asset.durationSec > s.maxSec) block(`${asset.durationSec}s exceeds the ${s.maxSec}s maximum`)
    } else {
      warn('duration unknown — cannot pre-check length')
    }
    if (asset.bytes > s.maxBytes) {
      block(`${(asset.bytes / MB).toFixed(0)}MB exceeds the ${(s.maxBytes / MB).toFixed(0)}MB limit`)
    }
    if (asset.width && asset.height) {
      const ratio = asset.width / asset.height
      if (s.aspect === '9:16' && Math.abs(ratio - 9 / 16) > 0.05) {
        warn(`${asset.width}x${asset.height} is not 9:16 — will be cropped or letterboxed`)
      }
    }
  }

  return { level, notes }
}

import { config } from '../config.js'
import { log } from '../logger.js'
import type { MediaAsset, PlatformId, PublishResult } from '../types.js'
import { PLATFORMS } from '../types.js'
import { instagramPublisher } from './instagram.js'
import { baseValidate, MB, type Capabilities, type Publisher } from './types.js'

/**
 * Platform limits as of the last time they were checked. VERIFY THESE against
 * the official developer docs before flipping DRY_RUN off — they move, and a
 * stale limit here means a wasted upload or a rejected post.
 */
const CAPS: Record<PlatformId, Capabilities> = {
  youtube: {
    video: true,
    photo: false,
    maxCaption: 5000, // description; the title is capped at 100 separately
    videoSpec: { minSec: 1, maxSec: 180, maxBytes: 256 * MB, aspect: '9:16' },
  },
  instagram: {
    video: true,
    photo: true,
    maxCaption: 2200,
    // Reels: MP4, H.264/HEVC, 9:16, 5-90s for Reels-tab eligibility, <=100MB
    videoSpec: { minSec: 5, maxSec: 90, maxBytes: 100 * MB, aspect: '9:16' },
  },
  tiktok: {
    video: true,
    photo: true,
    maxCaption: 2200,
    videoSpec: { minSec: 3, maxSec: 600, maxBytes: 500 * MB, aspect: '9:16' },
  },
  linkedin: {
    video: true,
    photo: true,
    maxCaption: 3000,
    videoSpec: { minSec: 3, maxSec: 600, maxBytes: 200 * MB, aspect: 'any' },
  },
  x: {
    video: true,
    photo: true,
    maxCaption: 280,
    videoSpec: { minSec: 1, maxSec: 140, maxBytes: 512 * MB, aspect: 'any' },
  },
}

/** Which env vars must be non-empty for a platform to count as connected. */
const REQUIRED_ENV: Record<PlatformId, (keyof typeof config)[]> = {
  youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'],
  instagram: ['INSTAGRAM_USER_ID', 'INSTAGRAM_ACCESS_TOKEN'],
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN'],
  linkedin: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_MEMBER_URN'],
  x: ['X_API_KEY', 'X_ACCESS_TOKEN'],
}

/**
 * A publisher that validates for real but simulates the network call.
 *
 * Each platform's `publish` is the ONLY thing left to implement — swap this
 * body for the real API call, leave everything else alone. Read the notes in
 * CURSOR_BRIEF_SOCIAL.md for what each one actually requires (Instagram's
 * container→poll→publish dance, TikTok's audit gate, and so on).
 */
function makePublisher(id: PlatformId): Publisher {
  const capabilities = CAPS[id]
  return {
    id,
    capabilities,
    isConnected() {
      return REQUIRED_ENV[id].every((k) => String(config[k] ?? '').length > 0)
    },
    validate(asset, caption) {
      return baseValidate(id, capabilities, asset, caption)
    },
    async publish(asset, caption): Promise<PublishResult> {
      if (config.DRY_RUN) {
        log.info(
          { platform: id, kind: asset.kind, bytes: asset.bytes, captionChars: caption.length },
          'DRY RUN — would publish',
        )
        return { platform: id, ok: true, permalink: `https://example.invalid/${id}/dry-run` }
      }
      if (!this.isConnected()) {
        return { platform: id, ok: false, error: 'not connected — credentials missing from .env' }
      }
      // ── IMPLEMENT ME ──────────────────────────────────────────────────────
      return {
        platform: id,
        ok: false,
        error: `${id} publisher not implemented yet — see CURSOR_BRIEF_SOCIAL.md step ${
          id === 'youtube' ? '5' : id === 'instagram' ? '7' : id === 'tiktok' ? '8' : '10'
        }`,
      }
    },
  }
}

export const publishers: Record<PlatformId, Publisher> = {
  ...(Object.fromEntries(
    PLATFORMS.filter((p) => p !== 'instagram').map((p) => [p, makePublisher(p)]),
  ) as Record<Exclude<PlatformId, 'instagram'>, Publisher>),
  instagram: instagramPublisher,
}

export function connectedPlatforms(): PlatformId[] {
  return PLATFORMS.filter((p) => publishers[p].isConnected())
}

export async function publishAll(
  platforms: PlatformId[],
  asset: MediaAsset,
  caption: string,
): Promise<PublishResult[]> {
  // Sequential on purpose: a partial failure is easier to reason about, and
  // several of these APIs rate-limit aggressively.
  const out: PublishResult[] = []
  for (const p of platforms) {
    try {
      out.push(await publishers[p].publish(asset, caption))
    } catch (err) {
      out.push({ platform: p, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return out
}

import { config } from '../config.js'
import { log } from '../logger.js'
import type { MediaAsset, PublishResult, ValidationResult } from '../types.js'
import { baseValidate, MB, type Capabilities, type Publisher } from './types.js'

/**
 * Instagram Graph API content publishing.
 * Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
 * Container reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
 *
 * Flow: POST /{ig-user-id}/media → poll status_code (video) → POST /media_publish
 * Rate limit: ~200 calls/hour per user (Meta app-level quotas apply).
 */
const GRAPH_API_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/** Poll interval while waiting for video container processing. */
const POLL_INTERVAL_MS = 5_000
/** Max ~3 minutes of polling before giving up. */
const POLL_MAX_ATTEMPTS = 36

const CAPABILITIES: Capabilities = {
  video: true,
  photo: true,
  maxCaption: 2200,
  // Reels: MP4, H.264/HEVC, 9:16, 5–90s for Reels-tab eligibility, ≤100MB
  videoSpec: { minSec: 5, maxSec: 90, maxBytes: 100 * MB, aspect: '9:16' },
}

interface GraphErrorBody {
  error?: { message: string; code?: number }
}

interface ContainerResponse extends GraphErrorBody {
  id?: string
}

interface StatusResponse extends GraphErrorBody {
  status_code?: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
}

interface PublishResponse extends GraphErrorBody {
  id?: string
}

interface PermalinkResponse extends GraphErrorBody {
  permalink?: string
}

/** Instagram fetches media from a public HTTPS URL — it will not accept file uploads. */
export function resolveMediaUrl(asset: MediaAsset): string | undefined {
  if (asset.publicUrl) return asset.publicUrl
  if (config.MEDIA_PUBLIC_BASE_URL) {
    const base = config.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, '')
    return `${base}/${encodeURIComponent(asset.fileId)}`
  }
  return undefined
}

function validate(asset: MediaAsset, caption: string): ValidationResult {
  const result = baseValidate('instagram', CAPABILITIES, asset, caption)
  if (!resolveMediaUrl(asset)) {
    result.notes.push(
      'needs MEDIA_PUBLIC_BASE_URL or asset.publicUrl — Instagram fetches from a public URL',
    )
    if (result.level !== 'block') result.level = 'warn'
  }
  return result
}

async function graphPost<T extends GraphErrorBody>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const body = new URLSearchParams(params)
  const res = await fetch(`${GRAPH_BASE}${path}`, { method: 'POST', body })
  const json = (await res.json()) as T
  if (!res.ok && !json.error) {
    throw new Error(`Instagram API HTTP ${res.status}`)
  }
  return json
}

async function graphGet<T extends GraphErrorBody>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${GRAPH_BASE}${path}?${qs}`)
  const json = (await res.json()) as T
  if (!res.ok && !json.error) {
    throw new Error(`Instagram API HTTP ${res.status}`)
  }
  return json
}

async function waitForContainer(containerId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const status = await graphGet<StatusResponse>(`/${containerId}`, {
      fields: 'status_code',
      access_token: token,
    })

    if (status.error) {
      throw new Error(status.error.message)
    }
    if (status.status_code === 'FINISHED') return
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(`Instagram container ${status.status_code.toLowerCase()}`)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error('Instagram container processing timed out')
}

async function fetchPermalink(mediaId: string, token: string): Promise<string | undefined> {
  const res = await graphGet<PermalinkResponse>(`/${mediaId}`, {
    fields: 'permalink',
    access_token: token,
  })
  if (res.error) return undefined
  return res.permalink
}

async function publish(asset: MediaAsset, caption: string): Promise<PublishResult> {
  if (config.DRY_RUN) {
    log.info(
      {
        platform: 'instagram',
        kind: asset.kind,
        bytes: asset.bytes,
        captionChars: caption.length,
        mediaUrl: resolveMediaUrl(asset) ?? '(would need public URL)',
      },
      'DRY RUN — would publish',
    )
    return { platform: 'instagram', ok: true, permalink: 'https://example.invalid/instagram/dry-run' }
  }

  if (!config.INSTAGRAM_ACCESS_TOKEN || !config.INSTAGRAM_USER_ID) {
    return {
      platform: 'instagram',
      ok: false,
      error: 'not connected — credentials missing from .env',
    }
  }

  const mediaUrl = resolveMediaUrl(asset)
  if (!mediaUrl) {
    return {
      platform: 'instagram',
      ok: false,
      error: 'no public media URL — set MEDIA_PUBLIC_BASE_URL or upload asset first',
    }
  }

  const token = config.INSTAGRAM_ACCESS_TOKEN
  const userId = config.INSTAGRAM_USER_ID

  const containerParams: Record<string, string> = {
    access_token: token,
    caption,
  }

  if (asset.kind === 'video') {
    // VIDEO media_type is deprecated; use REELS for single video posts.
    containerParams.media_type = 'REELS'
    containerParams.video_url = mediaUrl
  } else {
    containerParams.image_url = mediaUrl
  }

  const container = await graphPost<ContainerResponse>(`/${userId}/media`, containerParams)
  if (container.error || !container.id) {
    return {
      platform: 'instagram',
      ok: false,
      error: container.error?.message ?? 'Instagram container creation failed',
    }
  }

  if (asset.kind === 'video') {
    try {
      await waitForContainer(container.id, token)
    } catch (err) {
      return {
        platform: 'instagram',
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  const published = await graphPost<PublishResponse>(`/${userId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  })

  if (published.error || !published.id) {
    return {
      platform: 'instagram',
      ok: false,
      error: published.error?.message ?? 'Instagram publish failed',
    }
  }

  const permalink = (await fetchPermalink(published.id, token)) ?? undefined

  log.info({ platform: 'instagram', mediaId: published.id, permalink }, 'published to Instagram')

  return {
    platform: 'instagram',
    ok: true,
    permalink,
  }
}

export const instagramPublisher: Publisher = {
  id: 'instagram',
  capabilities: CAPABILITIES,
  isConnected() {
    return (
      config.INSTAGRAM_USER_ID.length > 0 && config.INSTAGRAM_ACCESS_TOKEN.length > 0
    )
  },
  validate,
  publish,
}

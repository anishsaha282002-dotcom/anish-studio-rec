import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { config } from '../config.js'
import { log } from '../logger.js'
import type { MediaAsset } from '../types.js'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
}

function isStorageConfigured(): boolean {
  return Boolean(
    config.S3_BUCKET &&
      config.S3_ACCESS_KEY_ID &&
      config.S3_SECRET_ACCESS_KEY &&
      config.MEDIA_PUBLIC_BASE_URL,
  )
}

function extensionFor(asset: MediaAsset): string {
  if (asset.mimeType) {
    const ext = MIME_EXT[asset.mimeType]
    if (ext) return ext
  }
  return asset.kind === 'video' ? '.mp4' : '.jpg'
}

function s3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: Boolean(config.S3_ENDPOINT),
  })
}

/** Download bytes from Telegram using a bot token and file_id. */
export async function downloadFromTelegram(
  botToken: string,
  fileId: string,
): Promise<{ buffer: Buffer; mimeType?: string }> {
  const file = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
  ).then((r) => r.json() as Promise<{ ok: boolean; result?: { file_path: string } }>)

  if (!file.ok || !file.result?.file_path) {
    throw new Error('Could not fetch file from Telegram — try re-sending the media')
  }

  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.result.file_path}`
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`Telegram file download failed (HTTP ${res.status})`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const mimeType = res.headers.get('content-type') ?? undefined
  return { buffer, mimeType }
}

/** Upload to S3-compatible storage and return the public HTTPS URL. */
export async function uploadToPublicStorage(
  buffer: Buffer,
  asset: MediaAsset,
): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error(
      'Media hosting not configured — set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and MEDIA_PUBLIC_BASE_URL in .env',
    )
  }

  const ext = extensionFor(asset)
  const key = `posts/${randomUUID()}${ext}`
  const contentType = asset.mimeType ?? (asset.kind === 'video' ? 'video/mp4' : 'image/jpeg')

  await s3Client().send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  const base = config.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, '')
  const publicUrl = `${base}/${key}`
  log.info({ key, bytes: buffer.length, publicUrl }, 'uploaded media to public storage')
  return publicUrl
}

/**
 * Ensure the asset has a publicUrl Instagram (and similar APIs) can fetch.
 * Downloads from Telegram when needed, uploads to object storage once.
 */
export async function ensurePublicUrl(
  botToken: string,
  asset: MediaAsset,
): Promise<MediaAsset> {
  if (asset.publicUrl) return asset
  if (asset.fileId === 'pending') {
    throw new Error('Media is still processing — wait a moment and try again')
  }

  const { buffer, mimeType } = await downloadFromTelegram(botToken, asset.fileId)
  const enriched: MediaAsset = { ...asset, mimeType: asset.mimeType ?? mimeType }
  const publicUrl = await uploadToPublicStorage(buffer, enriched)
  return { ...enriched, publicUrl }
}

export function isMediaHostingConfigured(): boolean {
  return isStorageConfigured()
}

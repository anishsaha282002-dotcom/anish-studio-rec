import pino from 'pino'
import { config } from './config.js'

/**
 * Anything matching these paths is replaced with [redacted] before it reaches
 * a log sink. Tokens end up in error objects and HTTP request dumps more often
 * than you would expect — this is the net that catches them.
 */
const REDACT = [
  'token',
  '*.token',
  'access_token',
  '*.access_token',
  'refresh_token',
  '*.refresh_token',
  'client_secret',
  '*.client_secret',
  'authorization',
  '*.authorization',
  'headers.authorization',
  '*.headers.authorization',
  'password',
  '*.password',
]

export const log = pino({
  level: config.LOG_LEVEL,
  redact: { paths: REDACT, censor: '[redacted]' },
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
})

/** Strip anything that looks like a bearer token out of free text before logging it. */
export function scrub(text: string): string {
  return text
    .replace(/\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g, '[bot-token]')
    .replace(/\b(?:EAA|IGQ)[A-Za-z0-9_-]{20,}\b/g, '[meta-token]')
    .replace(/\bya29\.[A-Za-z0-9_-]{20,}\b/g, '[google-token]')
}

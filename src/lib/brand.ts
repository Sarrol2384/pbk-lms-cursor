/** Static Memorial Leadership Institute emblem. Site chrome uses these files.
 * Certificate PDFs keep reading certificate_settings.logo_url and seal_url. */

export const INSTITUTE_EMBLEM_PATH = '/brand/emblem-256.png'

/** Absolute URL for email clients. Brevo does not fetch relative image paths. */
export function absoluteEmblemUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${INSTITUTE_EMBLEM_PATH}`
}

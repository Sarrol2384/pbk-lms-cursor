/** Public origin for canonical URLs, Open Graph and calendar links. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

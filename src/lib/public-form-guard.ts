type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** In-memory fixed window. Counts reset on restart and are not shared across server instances. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  Array.from(buckets.entries()).forEach(([bucketKey, bucket]) => {
    if (bucket.resetAt <= now) buckets.delete(bucketKey)
  })

  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }
  current.count += 1
  return { ok: true, retryAfterSec: 0 }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 80)
  }
  return request.headers.get('x-real-ip')?.trim().slice(0, 80) || 'unknown'
}

export function honeypotTripped(value: FormDataEntryValue | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export const PUBLIC_FORM_LIMIT = 5
export const PUBLIC_FORM_WINDOW_MS = 15 * 60 * 1000

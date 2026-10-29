type Bucket = { timestamps: number[] }

const buckets = new Map<string, Bucket>()

/**
 * In-memory sliding window. This works for a single Node server.
 * On several instances each one counts separately, so the real cap is
 * (limit × number of instances). It still stops a burst against one instance.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    buckets.set(key, bucket)
    return { ok: false, retryAfterSeconds }
  }

  bucket.timestamps.push(now)
  buckets.set(key, bucket)

  if (buckets.size > 5000) {
    const stale: string[] = []
    buckets.forEach((value, key) => {
      value.timestamps = value.timestamps.filter((t) => now - t < windowMs)
      if (value.timestamps.length === 0) stale.push(key)
    })
    stale.forEach((key) => buckets.delete(key))
  }

  return { ok: true }
}

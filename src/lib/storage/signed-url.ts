import { createServiceClient } from '@/lib/supabase/server'

export type PrivateBucket = 'payments' | 'submissions'

function isSafeObjectPath(path: string): boolean {
  if (!path || path.startsWith('/')) return false
  return path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
}

/** Turn a stored path or a legacy public/signed Supabase URL into an object path. */
export function storagePathFromValue(bucket: PrivateBucket, value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('\\')) return null

  if (bucket === 'payments' && trimmed.startsWith('proof-of-payment/')) {
    return isSafeObjectPath(trimmed) ? trimmed : null
  }
  if (bucket === 'submissions' && trimmed.startsWith('submissions/')) {
    return isSafeObjectPath(trimmed) ? trimmed : null
  }

  try {
    const url = new URL(trimmed)
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
    ]
    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker)
      if (idx === -1) continue
      const path = decodeURIComponent(url.pathname.slice(idx + marker.length).split('?')[0] || '')
      if (!isSafeObjectPath(path)) return null
      return path
    }
  } catch {
    return null
  }
  return null
}

/** Proof objects are `proof-of-payment/<userId>-<timestamp>.<ext>`. */
export function ownPaymentProofPath(userId: string, value: string): string | null {
  const path = storagePathFromValue('payments', value)
  if (!path) return null
  const prefix = `proof-of-payment/${userId}-`
  if (!path.startsWith(prefix)) return null
  const rest = path.slice(prefix.length)
  if (!/^\d+\.(pdf|jpg|jpeg|png)$/i.test(rest)) return null
  return path
}

/** Submission objects are `submissions/<userId>/<file>`. */
export function ownSubmissionPath(userId: string, value: string): string | null {
  const path = storagePathFromValue('submissions', value)
  if (!path) return null
  const prefix = `submissions/${userId}/`
  if (!path.startsWith(prefix)) return null
  const rest = path.slice(prefix.length)
  if (!rest || rest.includes('/')) return null
  return path
}

export async function signedUrlForStoredFile(
  bucket: PrivateBucket,
  value: string | null | undefined,
  expiresSec = 60 * 60
): Promise<string | null> {
  const path = storagePathFromValue(bucket, value)
  if (!path) return null
  const service = createServiceClient()
  const { data, error } = await service.storage.from(bucket).createSignedUrl(path, expiresSec)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

const PDF = [0x25, 0x50, 0x44, 0x46]
const PNG = [0x89, 0x50, 0x4e, 0x47]
const JPEG = [0xff, 0xd8, 0xff]

function startsWithBytes(buf: Buffer, magic: number[]): boolean {
  if (buf.length < magic.length) return false
  return magic.every((byte, i) => buf[i] === byte)
}

/** Confirm the bytes match the declared payment-proof type. Content-Type alone is not enough. */
export function paymentProofBytesMatch(mime: string, buf: Buffer): boolean {
  if (mime === 'application/pdf') return startsWithBytes(buf, PDF)
  if (mime === 'image/png') return startsWithBytes(buf, PNG)
  if (mime === 'image/jpeg' || mime === 'image/jpg') return startsWithBytes(buf, JPEG)
  return false
}

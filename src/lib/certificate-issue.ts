export const CERTIFICATE_SAVE_ERROR =
  'The Certificate of Completion could not be saved. Your course progress is unchanged. Try again.'

export type CertificateWriteError = { code?: string; message?: string }

export type CompletionCertificateInsert = {
  id: string
  user_id: string
  course_id: string
  certificate_number: string
  issued_at: string
  verification_url: string
}

export type CertificateRefreshResult = {
  ok: boolean
  created: boolean
  certificateId: string | null
  reason: 'already_issued' | 'issued' | 'insert_failed' | 'lookup_failed'
  error?: string
  detail?: string
}

export type CertificateLogEntry = { code: string; message: string }

const EMAIL_ADDRESS = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

/** Constraint text only. Addresses and extra fields stay out of Vercel logs. */
export function certificateLogEntry(error: CertificateWriteError | null | undefined): CertificateLogEntry {
  const raw = error?.message?.trim() || 'Certificate insert failed'
  return {
    code: error?.code || 'unknown',
    message: raw.replace(EMAIL_ADDRESS, '[redacted]').slice(0, 300),
  }
}

export function logCertificateWriteFailure(error: CertificateWriteError | null | undefined) {
  console.error('[certificate] insert failed', certificateLogEntry(error))
}

/**
 * certificates.verification_url is NOT NULL and has no default.
 * A relative path still satisfies the column when the public app URL is unset.
 * The path stays /verify/{id} so certificates already stored keep working.
 */
export function completionVerificationUrl(certificateId: string, appUrl: string | null | undefined): string {
  const path = `/verify/${certificateId}`
  const base = (appUrl ?? '').trim().replace(/\/$/, '')
  if (!base) return path
  try {
    return `${new URL(base).origin}${path}`
  } catch {
    return path
  }
}

export function completionCertificateRow(input: {
  userId: string
  courseId: string
  certificateId: string
  certificateNumber: string
  issuedAt: string
  appUrl: string | null | undefined
}): CompletionCertificateInsert {
  return {
    id: input.certificateId,
    user_id: input.userId,
    course_id: input.courseId,
    certificate_number: input.certificateNumber,
    issued_at: input.issuedAt,
    verification_url: completionVerificationUrl(input.certificateId, input.appUrl),
  }
}

type Found = { id: string | null; error: CertificateWriteError | null }
type Inserted = { id: string | null; error: CertificateWriteError | null }

function isUniqueViolation(error: CertificateWriteError | null): boolean {
  return error?.code === '23505'
}

/**
 * Insert one completion row with the service role. Duplicate user/course is
 * success without another email. A certificate-number collision retries once.
 * Any other database error is logged and returned. Nothing is emailed unless
 * this call inserted the row.
 */
export async function persistCompletionCertificate(input: {
  userId: string
  courseId: string
  appUrl: string | null
  now: () => string
  newId: () => string
  newNumber: () => string
  find: () => Promise<Found>
  insert: (row: CompletionCertificateInsert) => Promise<Inserted>
  notify: (certificateNumber: string) => Promise<void>
  log?: (error: CertificateWriteError | null | undefined) => void
}): Promise<CertificateRefreshResult> {
  const log = input.log ?? logCertificateWriteFailure
  const existing = await input.find()
  if (existing.error) {
    log(existing.error)
    const detail = certificateLogEntry(existing.error).message
    return {
      ok: false,
      created: false,
      certificateId: null,
      reason: 'lookup_failed',
      error: CERTIFICATE_SAVE_ERROR,
      detail,
    }
  }
  if (existing.id) {
    return { ok: true, created: false, certificateId: existing.id, reason: 'already_issued' }
  }

  let lastError: CertificateWriteError | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = completionCertificateRow({
      userId: input.userId,
      courseId: input.courseId,
      certificateId: input.newId(),
      certificateNumber: input.newNumber(),
      issuedAt: input.now(),
      appUrl: input.appUrl,
    })
    const inserted = await input.insert(row)
    if (!inserted.error && inserted.id) {
      try {
        await input.notify(row.certificate_number)
      } catch {
        console.error('[certificate] issue email failed')
      }
      return { ok: true, created: true, certificateId: inserted.id, reason: 'issued' }
    }
    if (!inserted.error) {
      lastError = { code: 'unknown', message: 'Certificate insert returned no row' }
      break
    }
    lastError = inserted.error
    if (isUniqueViolation(inserted.error)) {
      const again = await input.find()
      if (again.id) {
        return { ok: true, created: false, certificateId: again.id, reason: 'already_issued' }
      }
      if (again.error) {
        log(again.error)
        return {
          ok: false,
          created: false,
          certificateId: null,
          reason: 'lookup_failed',
          error: CERTIFICATE_SAVE_ERROR,
          detail: certificateLogEntry(again.error).message,
        }
      }
      continue
    }
    break
  }

  log(lastError)
  return {
    ok: false,
    created: false,
    certificateId: null,
    reason: 'insert_failed',
    error: CERTIFICATE_SAVE_ERROR,
    detail: certificateLogEntry(lastError).message,
  }
}

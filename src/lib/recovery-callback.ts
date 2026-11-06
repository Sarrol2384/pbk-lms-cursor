const RECOVERY_PATH = '/reset-password'

export function isRecoveryNext(next: string | null | undefined): boolean {
  return next === RECOVERY_PATH
}

/**
 * Recovery links keep the existing redirect, /api/auth/callback?next=/reset-password.
 * Only that exact next path is forwarded to the reset page. Signup verification
 * is left on /verify. A fragment on the callback is not visible here; sending
 * the browser to /reset-password lets it keep the fragment.
 */
export function recoveryCallbackLocation(input: {
  origin: string
  code: string | null
  next: string | null
  error: string | null
  errorDescription: string | null
}): string | null {
  if (!isRecoveryNext(input.next)) return null
  const url = new URL(RECOVERY_PATH, input.origin)
  if (input.error) {
    url.searchParams.set('error', input.error)
    if (input.errorDescription) url.searchParams.set('error_description', input.errorDescription)
    return url.toString()
  }
  if (input.code) {
    url.searchParams.set('code', input.code)
    return url.toString()
  }
  return url.toString()
}

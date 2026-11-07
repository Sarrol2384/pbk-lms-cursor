const RECOVERY_PATH = '/reset-password'

export function isRecoveryNext(next: string | null | undefined): boolean {
  return next === RECOVERY_PATH
}

/**
 * New recovery emails redirect straight to /reset-password. If an older link
 * still arrives here, only the exact next path /reset-password is forwarded.
 * Signup verification stays on /verify. Other next values are not followed.
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

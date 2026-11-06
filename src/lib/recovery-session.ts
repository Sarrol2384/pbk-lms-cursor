export type RecoveryLink =
  | { kind: 'recovery_tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string }
  | { kind: 'expired' }
  | { kind: 'invalid' }
  | { kind: 'missing' }

export type RecoveryPhase = 'verifying' | 'ready' | 'missing' | 'invalid' | 'expired'

const EXPIRED = /otp_expired|expired/i

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

function params(value: string): URLSearchParams {
  const trimmed = value.trim().replace(/^[#?]/, '')
  return new URLSearchParams(trimmed)
}

/**
 * Read a recovery link from the browser URL before the Supabase client starts.
 * The SSR browser client uses PKCE and can strip an implicit fragment without
 * establishing a session. Tokens are returned only so the page can call setSession.
 */
export function parseRecoveryLocation(input: { hash: string; search: string }): RecoveryLink {
  const hash = params(input.hash)
  const search = params(input.search)
  const errorCode = hash.get('error_code') || search.get('error_code') || hash.get('error') || search.get('error')
  const description = hash.get('error_description') || search.get('error_description')
  if (errorCode || description) {
    const blob = `${errorCode ?? ''} ${description ? decodeParam(description) : ''}`
    return EXPIRED.test(blob) ? { kind: 'expired' } : { kind: 'invalid' }
  }

  const type = (hash.get('type') || search.get('type') || '').toLowerCase()
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    return type === 'recovery'
      ? { kind: 'recovery_tokens', accessToken, refreshToken }
      : { kind: 'invalid' }
  }
  if (accessToken || refreshToken) return { kind: 'invalid' }

  const tokenHash = search.get('token_hash')
  if (tokenHash) {
    return type === 'recovery' ? { kind: 'token_hash', tokenHash } : { kind: 'invalid' }
  }

  const code = search.get('code')
  if (code) return { kind: 'code', code }
  return { kind: 'missing' }
}

export function initialRecoveryPhase(link: RecoveryLink): RecoveryPhase {
  if (link.kind === 'expired') return 'expired'
  if (link.kind === 'invalid') return 'invalid'
  return 'verifying'
}

/**
 * SIGNED_OUT fires before an implicit fragment is exchanged. It must not cancel
 * a recovery that is still being established, and it must not turn a missing
 * link into a usable session. A cookie session without a recovery link is not enough.
 */
export function reduceRecoveryPhase(
  phase: RecoveryPhase,
  event: { event: string; hasSession: boolean },
  link: RecoveryLink
): RecoveryPhase {
  if (phase === 'ready' || phase === 'expired' || phase === 'invalid' || phase === 'missing') return phase
  if (event.event === 'PASSWORD_RECOVERY' && event.hasSession) return 'ready'
  if (event.event === 'SIGNED_OUT') {
    return link.kind === 'missing' ? 'missing' : phase
  }
  if (event.event === 'INITIAL_SESSION' || event.event === 'SIGNED_IN') {
    if (link.kind === 'missing') return 'missing'
    return phase
  }
  return phase
}

export function classifyRecoveryFailure(message: string | null | undefined): 'expired' | 'invalid' {
  return message && EXPIRED.test(message) ? 'expired' : 'invalid'
}

export function phaseAfterRecoveryEstablished(ok: boolean, failure: 'expired' | 'invalid' | null): RecoveryPhase {
  if (ok) return 'ready'
  return failure === 'expired' ? 'expired' : 'invalid'
}

export function recoveryStatusMessage(phase: RecoveryPhase): string | null {
  switch (phase) {
    case 'verifying':
      return 'Verifying your reset link...'
    case 'ready':
      return null
    case 'missing':
      return 'This page needs a password reset link. Request a new one and open it in this browser.'
    case 'invalid':
      return 'This reset link is invalid. Request a new one and try again.'
    case 'expired':
      return 'This reset link has expired. Request a new one and try again.'
    default:
      return 'This reset link is invalid. Request a new one and try again.'
  }
}

/** Password update is allowed only after a recovery session was established on this page. */
export function canUpdateRecoveredPassword(phase: RecoveryPhase): boolean {
  return phase === 'ready'
}

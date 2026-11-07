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

/**
 * Supabase only honours redirectTo when it matches an allowlisted URL exactly.
 * Anything else is replaced with site_url. The approved recovery entry is the
 * current site origin plus /reset-password, with no callback path and no query.
 */
export function passwordRecoveryRedirect(pageOrigin: string): string {
  const url = new URL(pageOrigin)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Password recovery redirect must use http or https')
  }
  return `${url.origin}/reset-password`
}

type RecoveryEmailClient = {
  auth: {
    resetPasswordForEmail: (
      email: string,
      options: { redirectTo: string }
    ) => Promise<{ error: { message: string } | null }>
  }
}

/** Request the recovery email with the allowlisted /reset-password redirect. */
export function requestPasswordRecovery(client: RecoveryEmailClient, email: string, pageOrigin: string) {
  return client.auth.resetPasswordForEmail(email, { redirectTo: passwordRecoveryRedirect(pageOrigin) })
}

export type RecoveryAuth = {
  setSession: (credentials: { access_token: string; refresh_token: string }) => Promise<{
    data: { session: unknown }
    error: { message: string } | null
  }>
  exchangeCodeForSession: (code: string) => Promise<{
    data: { session: unknown }
    error: { message: string } | null
  }>
  verifyOtp: (params: { token_hash: string; type: 'recovery' }) => Promise<{
    data: { session: unknown }
    error: { message: string } | null
  }>
}

/**
 * Turn a link that already landed on /reset-password into a recovery session.
 * PKCE codes are exchanged here. Implicit fragments use setSession. token_hash
 * uses verifyOtp. A missing link is left for the auth listener.
 */
export async function establishRecoverySession(auth: RecoveryAuth, link: RecoveryLink): Promise<RecoveryPhase> {
  if (link.kind === 'recovery_tokens') {
    const { data, error } = await auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    })
    if (error || !data.session) return phaseAfterRecoveryEstablished(false, classifyRecoveryFailure(error?.message))
    return 'ready'
  }
  if (link.kind === 'code') {
    const { data, error } = await auth.exchangeCodeForSession(link.code)
    if (error || !data.session) return phaseAfterRecoveryEstablished(false, classifyRecoveryFailure(error?.message))
    return 'ready'
  }
  if (link.kind === 'token_hash') {
    const { data, error } = await auth.verifyOtp({ token_hash: link.tokenHash, type: 'recovery' })
    if (error || !data.session) return phaseAfterRecoveryEstablished(false, classifyRecoveryFailure(error?.message))
    return 'ready'
  }
  return initialRecoveryPhase(link)
}

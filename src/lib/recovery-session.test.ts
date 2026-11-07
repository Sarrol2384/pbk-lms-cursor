import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { recoveryCallbackLocation } from './recovery-callback.ts'
import {
  canUpdateRecoveredPassword,
  classifyRecoveryFailure,
  establishRecoverySession,
  initialRecoveryPhase,
  parseRecoveryLocation,
  passwordRecoveryRedirect,
  phaseAfterRecoveryEstablished,
  reduceRecoveryPhase,
  requestPasswordRecovery,
  type RecoveryAuth,
  type RecoveryLink,
} from './recovery-session.ts'

const STAGING_RESET_ORIGIN = 'https://pbk-lms-cursor-git-cursor-fix-cert-6940af-sarrol2384s-projects.vercel.app'

const tokens = {
  hash: '#access_token=access-token&refresh_token=refresh-token&type=recovery',
  search: '',
}

describe('recovery link parsing', () => {
  it('reads an implicit recovery fragment', () => {
    assert.deepEqual(parseRecoveryLocation(tokens), {
      kind: 'recovery_tokens',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
  })

  it('classifies expired and invalid links without treating them as a session', () => {
    assert.deepEqual(parseRecoveryLocation({
      hash: '',
      search: '?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    }), { kind: 'expired' })
    assert.deepEqual(parseRecoveryLocation({
      hash: '#error=access_denied&error_description=Invalid%20link',
      search: '',
    }), { kind: 'invalid' })
    assert.equal(initialRecoveryPhase({ kind: 'expired' }), 'expired')
    assert.equal(initialRecoveryPhase({ kind: 'missing' }), 'verifying')
  })

  it('accepts a PKCE code and a recovery token hash, and rejects other token types', () => {
    assert.deepEqual(parseRecoveryLocation({ hash: '', search: '?code=pkce-code' }), { kind: 'code', code: 'pkce-code' })
    assert.deepEqual(parseRecoveryLocation({ hash: '', search: '?token_hash=hash&type=recovery' }), { kind: 'token_hash', tokenHash: 'hash' })
    assert.equal(parseRecoveryLocation({ hash: '#access_token=a&refresh_token=b&type=signup', search: '' }).kind, 'invalid')
    assert.equal(parseRecoveryLocation({ hash: '', search: '' }).kind, 'missing')
  })
})

describe('recovery phase', () => {
  const implicit: RecoveryLink = { kind: 'recovery_tokens', accessToken: 'a', refreshToken: 'b' }

  it('does not let the initial SIGNED_OUT cancel an implicit recovery', () => {
    const start = initialRecoveryPhase(implicit)
    const afterSignedOut = reduceRecoveryPhase(start, { event: 'SIGNED_OUT', hasSession: false }, implicit)
    assert.equal(afterSignedOut, 'verifying')
    assert.equal(canUpdateRecoveredPassword(afterSignedOut), false)
    const ready = phaseAfterRecoveryEstablished(true, null)
    const stillReady = reduceRecoveryPhase(ready, { event: 'SIGNED_OUT', hasSession: false }, implicit)
    assert.equal(stillReady, 'ready')
    assert.equal(canUpdateRecoveredPassword(stillReady), true)
  })

  it('enables update from PASSWORD_RECOVERY or INITIAL_SESSION only when that session came from recovery', () => {
    const missing: RecoveryLink = { kind: 'missing' }
    const fromRecovery = reduceRecoveryPhase('verifying', { event: 'PASSWORD_RECOVERY', hasSession: true }, missing)
    assert.equal(fromRecovery, 'ready')
    const existingLogin = reduceRecoveryPhase('verifying', { event: 'INITIAL_SESSION', hasSession: true }, missing)
    assert.equal(existingLogin, 'missing')
    assert.equal(canUpdateRecoveredPassword(existingLogin), false)
    const initialDuringImplicit = reduceRecoveryPhase('verifying', { event: 'INITIAL_SESSION', hasSession: true }, implicit)
    assert.equal(initialDuringImplicit, 'verifying')
    assert.equal(phaseAfterRecoveryEstablished(false, classifyRecoveryFailure('Email link is invalid or has expired')), 'expired')
    assert.equal(phaseAfterRecoveryEstablished(false, classifyRecoveryFailure('bad token')), 'invalid')
  })
})

describe('resetPasswordForEmail redirect', () => {
  it('requests the exact allowlisted /reset-password URL and not the callback or site_url', async () => {
    let redirectTo = ''
    let emailSent = ''
    const result = await requestPasswordRecovery({
      auth: {
        resetPasswordForEmail: async (email, options) => {
          emailSent = email
          redirectTo = options.redirectTo
          return { error: null }
        },
      },
    }, 'learner@example.com', STAGING_RESET_ORIGIN)
    assert.equal(result.error, null)
    assert.equal(emailSent, 'learner@example.com')
    assert.equal(redirectTo, `${STAGING_RESET_ORIGIN}/reset-password`)
    assert.equal(passwordRecoveryRedirect(`${STAGING_RESET_ORIGIN}/`), redirectTo)
    assert.equal(redirectTo.includes('/api/auth/callback'), false)
    assert.equal(redirectTo.includes('next='), false)
    assert.equal(redirectTo.includes('localhost'), false)
    assert.equal(redirectTo.includes('?'), false)
  })

  it('uses the page origin rather than rewriting a staging visit to localhost', () => {
    assert.equal(
      passwordRecoveryRedirect('http://localhost:3000'),
      'http://localhost:3000/reset-password'
    )
    assert.notEqual(
      passwordRecoveryRedirect(STAGING_RESET_ORIGIN),
      'http://localhost:3000'
    )
    assert.notEqual(
      passwordRecoveryRedirect(STAGING_RESET_ORIGIN),
      'http://localhost:3000/api/auth/callback?next=/reset-password'
    )
  })
})

describe('recovery code exchange', () => {
  function auth(overrides?: Partial<RecoveryAuth>): RecoveryAuth & { calls: string[] } {
    const calls: string[] = []
    return {
      calls,
      setSession: async () => {
        calls.push('setSession')
        return { data: { session: { ok: true } }, error: null }
      },
      exchangeCodeForSession: async (code) => {
        calls.push(`exchange:${code}`)
        return { data: { session: { ok: true } }, error: null }
      },
      verifyOtp: async (params) => {
        calls.push(`otp:${params.type}:${params.token_hash}`)
        return { data: { session: { ok: true } }, error: null }
      },
      ...overrides,
    }
  }

  it('exchanges a PKCE code that lands on /reset-password and does not use another grant', async () => {
    const client = auth()
    const link = parseRecoveryLocation({ hash: '', search: '?code=pkce-recovery-code' })
    const phase = await establishRecoverySession(client, link)
    assert.equal(phase, 'ready')
    assert.deepEqual(client.calls, ['exchange:pkce-recovery-code'])
  })

  it('keeps the form locked when the code exchange fails', async () => {
    const client = auth({
      exchangeCodeForSession: async (code) => {
        return { data: { session: null }, error: { message: `code ${code} expired` } }
      },
    })
    const phase = await establishRecoverySession(client, { kind: 'code', code: 'used-code' })
    assert.equal(phase, 'expired')
    assert.equal(canUpdateRecoveredPassword(phase), false)
  })

  it('uses setSession for an implicit fragment and verifyOtp for a recovery token hash', async () => {
    const implicit = auth()
    const implicitPhase = await establishRecoverySession(implicit, {
      kind: 'recovery_tokens',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    assert.equal(implicitPhase, 'ready')
    assert.deepEqual(implicit.calls, ['setSession'])

    const hashed = auth()
    const hashPhase = await establishRecoverySession(hashed, { kind: 'token_hash', tokenHash: 'th_123' })
    assert.equal(hashPhase, 'ready')
    assert.deepEqual(hashed.calls, ['otp:recovery:th_123'])
  })
})

describe('recovery callback', () => {
  it('forwards only the exact reset page and preserves code or error there', () => {
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: 'pkce-code',
      next: '/reset-password',
      error: null,
      errorDescription: null,
    }), 'https://staging.example.com/reset-password?code=pkce-code')
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: null,
      next: '/reset-password',
      error: null,
      errorDescription: null,
    }), 'https://staging.example.com/reset-password')
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: null,
      next: '/reset-password',
      error: 'access_denied',
      errorDescription: 'Email link is invalid or has expired',
    }), 'https://staging.example.com/reset-password?error=access_denied&error_description=Email+link+is+invalid+or+has+expired')
  })

  it('does not redirect signup or an open redirect to the reset page', () => {
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: 'signup-code',
      next: '/student/dashboard',
      error: null,
      errorDescription: null,
    }), null)
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: 'signup-code',
      next: 'https://evil.example/reset-password',
      error: null,
      errorDescription: null,
    }), null)
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: 'signup-code',
      next: '//evil.example/reset-password',
      error: null,
      errorDescription: null,
    }), null)
    assert.equal(recoveryCallbackLocation({
      origin: 'https://staging.example.com',
      code: null,
      next: null,
      error: null,
      errorDescription: null,
    }), null)
  })
})

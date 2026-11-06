import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { recoveryCallbackLocation } from './recovery-callback.ts'
import {
  canUpdateRecoveredPassword,
  classifyRecoveryFailure,
  initialRecoveryPhase,
  parseRecoveryLocation,
  phaseAfterRecoveryEstablished,
  reduceRecoveryPhase,
  type RecoveryLink,
} from './recovery-session.ts'

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

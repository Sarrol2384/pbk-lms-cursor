'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/auth/PasswordInput'
import {
  canUpdateRecoveredPassword,
  classifyRecoveryFailure,
  initialRecoveryPhase,
  parseRecoveryLocation,
  phaseAfterRecoveryEstablished,
  recoveryStatusMessage,
  reduceRecoveryPhase,
  type RecoveryLink,
  type RecoveryPhase,
} from '@/lib/recovery-session'

const LOGIN_PATH = '/login'

function clearRecoveryParams() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('error')
  url.searchParams.delete('error_code')
  url.searchParams.delete('error_description')
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [phase, setPhase] = useState<RecoveryPhase>('verifying')

  useEffect(() => {
    const link = parseRecoveryLocation({
      hash: window.location.hash,
      search: window.location.search,
    })
    let current = initialRecoveryPhase(link)
    setPhase(current)
    if (current === 'expired' || current === 'invalid') {
      clearRecoveryParams()
      return
    }
    // @supabase/ssr forces PKCE and detectSessionInUrl. An implicit recovery
    // fragment is rejected ("Not a valid PKCE flow url") and no PASSWORD_RECOVERY
    // event is emitted. Capture the fragment first, remove it, then setSession
    // so the cookie storage used by the server receives the recovery session.
    if (link.kind !== 'missing') clearRecoveryParams()

    const supabase = createClient()
    let cancelled = false
    const apply = (next: RecoveryPhase) => {
      current = next
      if (!cancelled) setPhase(next)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      apply(reduceRecoveryPhase(current, { event, hasSession: !!session }, link))
    })

    void establishRecovery(supabase, link, apply)

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canUpdateRecoveredPassword(phase)) return
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setPhase('invalid')
      setError(recoveryStatusMessage('invalid'))
      setLoading(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    await supabase.auth.signOut()
    setTimeout(() => router.push(LOGIN_PATH), 2500)
  }

  const ready = canUpdateRecoveredPassword(phase)
  const linkMessage = recoveryStatusMessage(phase)
  const linkFailed = phase === 'missing' || phase === 'invalid' || phase === 'expired'

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Password updated</h2>
        <p className="text-gray-500 text-sm">Redirecting you to login...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h2>
      <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}
      {!error && linkMessage && (
        <div role="status" className={`rounded-lg px-4 py-3 text-sm mb-4 ${linkFailed ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          {linkMessage}
        </div>
      )}
      {linkFailed && (
        <p className="text-sm mb-4">
          <Link href="/forgot-password" className="text-blue-600 font-medium hover:underline">Request a new reset link</Link>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-password">New password</label>
          <PasswordInput id="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm-password">Confirm new password</label>
          <PasswordInput id="confirm-password" value={confirm} onChange={e => setConfirm(e.target.value)} required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Repeat your password" />
        </div>
        <button type="submit" disabled={loading || !ready}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

async function establishRecovery(
  supabase: ReturnType<typeof createClient>,
  link: RecoveryLink,
  apply: (phase: RecoveryPhase) => void
) {
  if (link.kind === 'recovery_tokens') {
    const { data, error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    })
    if (error || !data.session) {
      apply(phaseAfterRecoveryEstablished(false, classifyRecoveryFailure(error?.message)))
      return
    }
    clearRecoveryParams()
    apply('ready')
    return
  }

  if (link.kind === 'code') {
    const { data, error } = await supabase.auth.exchangeCodeForSession(link.code)
    if (error || !data.session) {
      apply(phaseAfterRecoveryEstablished(false, classifyRecoveryFailure(error?.message)))
      return
    }
    clearRecoveryParams()
    apply('ready')
    return
  }

  if (link.kind === 'token_hash') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: link.tokenHash,
      type: 'recovery',
    })
    if (error || !data.session) {
      apply(phaseAfterRecoveryEstablished(false, classifyRecoveryFailure(error?.message)))
      return
    }
    clearRecoveryParams()
    apply('ready')
  }
}

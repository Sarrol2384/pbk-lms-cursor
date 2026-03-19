'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setTimeout(() => router.push('/login'), 2500) }
  }

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
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
      {!ready && <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm mb-4">Verifying your reset link...</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
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

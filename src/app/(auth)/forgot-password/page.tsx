'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Email sent</h2>
        <p className="text-gray-500 text-sm mb-6">Check your inbox for a password reset link.</p>
        <Link href="/login" className="text-blue-600 text-sm font-medium hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset password</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your email and we&apos;ll send a reset link.</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/login" className="text-blue-600 font-medium hover:underline">Back to login</Link>
      </p>
    </div>
  )
}

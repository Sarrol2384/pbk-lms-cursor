'use client'

import { useState } from 'react'

export default function ResendEmailButton({ userId, courseId }: { userId: string; courseId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleResend() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/payments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: 'Email sent. Check your inbox (and spam folder).' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send email.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="text-sm font-medium text-blue-700 hover:text-blue-900 underline disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Resend banking details email'}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}

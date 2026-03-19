'use client'

import { useState } from 'react'

export default function DashboardResetButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function runFullReset() {
    if (!window.confirm('This will permanently delete ALL students, enrollments, and payments. Your admin account will remain. This cannot be undone. Continue?')) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/cleanup-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const msg = (data.log ?? []).join(' • ') || 'Done.'
        setResult(msg.includes('Issues:') ? `${msg} If students reappear, remove them manually in Supabase Dashboard → Authentication → Users.` : msg)
        setTimeout(() => window.location.reload(), 800)
      } else {
        setResult(data.error || 'Reset failed.')
      }
    } catch {
      setResult('Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={runFullReset}
        disabled={loading}
        className="text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Resetting…' : 'Reset all to 0 (remove students, enrollments, payments)'}
      </button>
      {result && (
        <p className="text-xs text-gray-600 mt-2 bg-gray-50 border border-gray-200 rounded px-3 py-2">{result}</p>
      )}
    </div>
  )
}

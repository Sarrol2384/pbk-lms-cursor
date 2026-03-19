'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CleanupOrphansButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function runCleanup() {
    if (!window.confirm('This will permanently delete all orphan enrollments, payments, and progress for users that no longer exist. Continue?')) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/cleanup-orphans', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult((data.log ?? []).join(' | ') || 'Done.')
        router.refresh()
      } else {
        setResult(data.error || 'Cleanup failed.')
      }
    } catch {
      setResult('Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={runCleanup}
        disabled={loading}
        className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Cleaning up…' : 'Clean up orphan data (enrollments for deleted users)'}
      </button>
      {result && (
        <p className="text-xs text-gray-600 mt-2 bg-gray-50 border border-gray-200 rounded px-3 py-2">{result}</p>
      )}
    </div>
  )
}

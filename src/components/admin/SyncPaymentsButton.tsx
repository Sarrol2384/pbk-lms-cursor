'use client'

import { useState } from 'react'

export default function SyncPaymentsButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/sync-payments', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const parts = []
        if (data.synced > 0) parts.push(`Synced ${data.synced} payment(s)`)
        if (data.accessGranted > 0) parts.push(`Granted access to ${data.accessGranted} student(s)`)
        setMessage(parts.length > 0 ? parts.join('. ') + '. Refreshing…' : 'Sync complete.')
        setTimeout(() => window.location.reload(), 800)
      } else {
        setMessage(data.error || 'Sync failed')
      }
    } catch {
      setMessage('Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Syncing…' : 'Sync payments'}
      </button>
      {message && <span className="ml-2 text-xs text-gray-600">{message}</span>}
    </div>
  )
}

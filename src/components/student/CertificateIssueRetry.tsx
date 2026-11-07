'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CertificateIssueRetry({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function retry() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/student/certificate-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'The Certificate of Completion could not be saved. Try again.')
        return
      }
      router.refresh()
    } catch {
      setError('The Certificate of Completion could not be saved. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={retry}
        disabled={loading}
        className="text-sm font-medium text-red-800 underline disabled:opacity-50"
      >
        {loading ? 'Trying again...' : 'Try again'}
      </button>
      {error && <p className="text-sm text-red-800 mt-2">{error}</p>}
    </div>
  )
}

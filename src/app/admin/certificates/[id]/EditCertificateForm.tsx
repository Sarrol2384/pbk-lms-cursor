'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function EditCertificateForm({
  certId,
  certificateNumber,
  issuedAt,
}: { certId: string; certificateNumber: string; issuedAt: string }) {
  const [number, setNumber] = useState(certificateNumber)
  const [date, setDate] = useState(issuedAt ? issuedAt.slice(0, 10) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!number.trim()) {
      setError('Certificate number is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/certificates/${certId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate_number: number.trim(), issued_at: date ? `${date}T00:00:00.000Z` : null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || res.statusText)
      }
      router.push('/admin/certificates')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Certificate number</label>
        <input
          type="text"
          value={number}
          onChange={e => setNumber(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Issued date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm">
        {loading ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  )
}

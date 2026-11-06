'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GradeSubmissionForm({
  submissionId,
  totalMarks,
  currentMarks,
  currentFeedback,
}: { submissionId: string; totalMarks: number; currentMarks: number | null; currentFeedback: string | null }) {
  const [marks, setMarks] = useState(currentMarks ?? '')
  const [feedback, setFeedback] = useState(currentFeedback ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedWarning, setSavedWarning] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(marks)
    if (Number.isNaN(m) || m < 0 || m > totalMarks) {
      setError(`Enter marks from 0 to ${totalMarks}`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/lecturer/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks_obtained: m, feedback: feedback.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || res.statusText)
      }
      if (typeof data.certificateError === 'string' && data.certificateError) {
        setSavedWarning(`Grade saved. ${data.certificateError}`)
        return
      }
      router.push('/lecturer/dashboard')
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Marks (0 – {totalMarks})</label>
        <input
          type="number"
          min={0}
          max={totalMarks}
          step={0.5}
          value={marks}
          onChange={e => setMarks(e.target.value)}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (optional)</label>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedWarning && (
        <p className="text-sm text-red-800">
          {savedWarning}{' '}
          <button type="button" onClick={() => router.push('/lecturer/dashboard')} className="underline font-medium">
            Back to dashboard
          </button>
        </p>
      )}
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm">
        {loading ? 'Saving...' : 'Save grade'}
      </button>
    </form>
  )
}

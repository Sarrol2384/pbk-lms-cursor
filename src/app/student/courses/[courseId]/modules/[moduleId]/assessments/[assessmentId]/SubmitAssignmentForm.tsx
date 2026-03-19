'use client'

import { useState } from 'react'

export function SubmitAssignmentForm({ assessmentId, existingSubmissionId }: { assessmentId: string; existingSubmissionId?: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file.' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/upload/submission', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}))
        throw new Error(d.error || uploadRes.statusText)
      }
      const { url } = await uploadRes.json()
      const subRes = await fetch('/api/student/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, fileUrl: url }),
      })
      if (!subRes.ok) {
        const d = await subRes.json().catch(() => ({}))
        throw new Error(d.error || subRes.statusText)
      }
      setMessage({ type: 'success', text: 'Submission sent. Your lecturer will grade it shortly.' })
      setFile(null)
      window.location.reload()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Submission failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Upload your work (PDF, Word, image)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/jpg,image/png"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
        />
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
      )}
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm">
        {loading ? 'Submitting...' : existingSubmissionId ? 'Resubmit' : 'Submit assignment'}
      </button>
    </form>
  )
}

'use client'

import { useState, useRef } from 'react'

export default function UploadProofOfPayment({
  paymentId: initialPaymentId,
  enrollmentId,
  courseId,
}: {
  paymentId: string | null
  enrollmentId: string
  courseId: string
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) {
      setMessage({ type: 'error', text: 'Please choose a file (PDF, JPG or PNG, max 5MB).' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      let paymentId = initialPaymentId
      if (!paymentId) {
        const enRes = await fetch(`/api/payments/for-enrollment?enrollmentId=${encodeURIComponent(enrollmentId)}&courseId=${encodeURIComponent(courseId)}`)
        const enData = await enRes.json().catch(() => ({}))
        if (!enRes.ok || !enData.paymentId) {
          setMessage({ type: 'error', text: enData.error || 'Could not link to your application. Please try again.' })
          setLoading(false)
          return
        }
        paymentId = enData.paymentId
      }
      const formData = new FormData()
      formData.set('file', file)
      const uploadRes = await fetch('/api/upload/payment', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok) {
        setMessage({ type: 'error', text: uploadData.error || 'Upload failed.' })
        setLoading(false)
        return
      }
      const proofUrl = uploadData.url
      const patchRes = await fetch('/api/payments/proof', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, proofUrl }),
      })
      const patchData = await patchRes.json().catch(() => ({}))
      if (!patchRes.ok) {
        setMessage({ type: 'error', text: patchData.error || 'Could not attach proof to your application.' })
        setLoading(false)
        return
      }
      setUploadedUrl(proofUrl)
      setMessage({ type: 'success', text: 'Proof of payment uploaded. Admin will review and approve your enrollment.' })
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-blue-200">
      <p className="text-sm font-medium text-blue-900 mb-2">Upload proof of payment</p>
      <p className="text-xs text-blue-700 mb-3">After you have paid, upload a PDF, JPG or PNG of your proof (max 5MB). Admin will verify and approve your enrollment.</p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      {uploadedUrl && (
        <p className="mt-2 text-xs text-green-700">
          Proof uploaded. <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="underline">View file</a>
        </p>
      )}
      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}

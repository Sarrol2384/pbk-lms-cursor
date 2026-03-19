'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentReviewCard({
  paymentId,
  proofUrl,
  balance,
  total,
  totalInstallments,
  enrollmentId,
}: {
  paymentId: string
  proofUrl: string | null
  balance: number
  total: number
  totalInstallments?: number
  enrollmentId?: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [recordAmount, setRecordAmount] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  async function recordPayment() {
    const num = parseInt(recordAmount.replace(/\D/g, ''), 10)
    if (Number.isNaN(num) || num <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid amount (number > 0)' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, amountReceived: num }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: data.fullyPaid ? 'Payment recorded and enrollment approved' : 'Payment recorded' })
        setRecordAmount('')
        setTimeout(() => router.push('/admin/students'), 1000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record payment' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  async function approveFull() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: 'Enrollment approved. Student can access the course.' })
        setTimeout(() => router.push('/admin/students'), 1000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to approve' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  async function putOnHold() {
    if (!enrollmentId) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'on_hold' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: 'Enrollment put on hold. Student access suspended.' })
        setTimeout(() => router.push('/admin/students'), 1000)
      } else {
        setMessage({ type: 'error', text: (data.error as string) || 'Failed to put on hold' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  async function rejectPayment() {
    if (!rejectReason.trim()) {
      setMessage({ type: 'error', text: 'Please enter a rejection reason' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/payments/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, reason: rejectReason }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payment rejected' })
        setTimeout(() => router.push('/admin/students'), 1000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reject' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' })
    } finally {
      setLoading(false)
      setShowReject(false)
      setRejectReason('')
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
      {proofUrl ? (
        <a
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          View proof of payment
        </a>
      ) : (
        <span className="inline-flex items-center text-sm bg-gray-100 text-gray-400 px-4 py-2 rounded-lg">
          No proof uploaded yet
        </span>
      )}

      {message && (
        <div
          className={`text-sm px-4 py-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        {(balance > 0 || (totalInstallments && totalInstallments > 1) || total <= 0) && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
              placeholder="Amount received (R)"
              className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={recordPayment}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Record payment
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={approveFull}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Approve full payment
        </button>
        {enrollmentId && (
          <button
            type="button"
            onClick={putOnHold}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Put on hold
          </button>
        )}
        {!showReject ? (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Reject
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="button"
              onClick={rejectPayment}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg shrink-0"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => { setShowReject(false); setRejectReason('') }}
              disabled={loading}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

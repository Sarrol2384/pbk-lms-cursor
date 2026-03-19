'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function formatFee(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const PLANS = [
  { months: 1, label: 'Pay in full' },
  { months: 3, label: '3 monthly instalments' },
  { months: 6, label: '6 monthly instalments' },
  { months: 12, label: '12 monthly instalments' },
]

type Props = { enrollmentId: string; courseId: string; fee: number; durationMonths: number }

export default function CompletePaymentForm({ enrollmentId, courseId, fee, durationMonths }: Props) {
  const router = useRouter()
  const [selectedMonths, setSelectedMonths] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxDuration = durationMonths ?? 12
  const availablePlans = PLANS.filter(p => p.months <= maxDuration)
  const monthlyAmount = selectedMonths > 1 ? Math.ceil(fee / selectedMonths) : fee

  async function submitPlan() {
    if (fee <= 0) {
      setError('Course fee not set. Contact admin.')
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/student/complete-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, courseId, totalInstallments: selectedMonths }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (data.error === 'Payment plan already submitted') {
        setSaved(true)
        router.refresh()
        setLoading(false)
        return
      }
      setError(data.error || 'Failed to submit payment plan')
      setLoading(false)
      return
    }
    setSaved(true)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Choose your payment plan</h2>
        <p className="text-sm text-gray-600 mb-4">Total course fee: <strong>R{formatFee(fee)}</strong>. Select how you will pay, then upload your proof of payment below.</p>
        <div className="space-y-2">
          {availablePlans.map(plan => {
            const monthly = plan.months > 1 ? Math.ceil(fee / plan.months) : fee
            return (
              <label
                key={plan.months}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedMonths === plan.months ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="plan"
                    value={plan.months}
                    checked={selectedMonths === plan.months}
                    onChange={() => setSelectedMonths(plan.months)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-900">{plan.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">R{formatFee(monthly)}{plan.months > 1 ? '/mo' : ''}</p>
                  {plan.months > 1 && <p className="text-xs text-gray-400">Total: R{formatFee(fee)}</p>}
                </div>
              </label>
            )
          })}
        </div>
        {error === 'Payment plan already submitted' && (
          <p className="mt-2 text-sm text-red-600">
            Your plan was already submitted.{' '}
            <button type="button" onClick={() => router.refresh()} className="underline font-medium hover:text-red-800">
              Refresh to upload proof
            </button>
          </p>
        )}
        {error && error !== 'Payment plan already submitted' && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {saved ? (
          <div className="mt-4 py-3 px-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-medium text-center">
            Payment plan saved ✓
          </div>
        ) : (
          <button
            type="button"
            onClick={submitPlan}
            disabled={loading || fee <= 0}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Saving…' : 'Save payment plan'}
          </button>
        )}
      </div>
    </div>
  )
}

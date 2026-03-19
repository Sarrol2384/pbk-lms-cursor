'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Course = { id: string; title: string; fee: number | null; duration_months: number | null }

export default function EnrollForm({ course, userId }: { course: Course; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function applyNow() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: enrollErr } = await supabase
      .from('enrollments')
      .insert({ user_id: userId, course_id: course.id, status: 'pending_approval' })
      .select('id').single()

    if (enrollErr) {
      if (enrollErr.code === '23505') {
        router.push(`/student/enroll/${course.id}`)
        return
      }
      setError(enrollErr.message)
      setLoading(false)
      return
    }

    const notifyRes = await fetch('/api/payments/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId: course.id, applicationOnly: true }),
    })

    if (!notifyRes.ok) {
      router.push(`/student/enroll/${course.id}?saved=1`)
      setLoading(false)
      return
    }

    router.push(`/student/enroll/${course.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h3>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Submit your application below</li>
          <li>Choose your payment plan (full, 3, 6 or 12 months) and upload proof of payment on the next screen</li>
          <li>After your first payment is verified, you can start the course</li>
        </ol>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <button onClick={applyNow} disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors">
        {loading ? 'Submitting...' : 'Submit application'}
      </button>
    </div>
  )
}

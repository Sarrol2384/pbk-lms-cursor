'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateShort } from '@/lib/utils'

type EnrollmentRow = {
  id: string
  user_id: string
  course_id: string
  status: string
  enrolled_at: string | null
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
  courses: { title: string | null; code: string | null } | null
}

export default function EnrollmentsTable({ enrollments: initial }: { enrollments: EnrollmentRow[] }) {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function removeEnrollment(row: EnrollmentRow) {
    const name = [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ') || row.profiles?.email || 'Student'
    const course = row.courses?.title || row.courses?.code || 'course'
    if (!window.confirm(`Remove this enrollment?\n\n${name} — ${course}\n\nThis will delete progress, submissions, and certificate for this course. This cannot be undone.`)) {
      return
    }
    setDeletingId(row.id)
    setMessage(null)
    try {
      const id = row.id || 'unknown'
      const q = new URLSearchParams({ user_id: row.user_id, course_id: row.course_id })
      const res = await fetch(`/api/admin/enrollments/${id}?${q.toString()}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: row.user_id, course_id: row.course_id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not remove enrollment.')
      } else {
        setEnrollments(prev => prev.filter(e => e.id !== row.id))
        setMessage('Enrollment removed. You can now remove this user from Users if needed.')
        router.refresh()
      }
    } catch {
      setMessage('Request failed. Please try again.')
    } finally {
      setDeletingId(null)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg">
          {message}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Course</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Enrolled</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No enrollments.</td>
                </tr>
              ) : (
                enrollments.map(row => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {[row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ') || '—'}
                      </p>
                      <p className="text-xs text-gray-500">{row.profiles?.email ?? '—'}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {row.courses?.title ?? '—'} {row.courses?.code && `(${row.courses.code})`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'approved' ? 'bg-green-100 text-green-800' :
                        row.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDateShort(row.enrolled_at)}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => removeEnrollment(row)}
                        disabled={deletingId === row.id}
                        className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded disabled:opacity-50"
                      >
                        {deletingId === row.id ? 'Removing…' : 'Remove enrollment'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { formatDateShort } from '@/lib/utils'

function formatAmount(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

type Payment = {
  id: string
  user_id?: string
  course_id?: string
  amount: number
  status: string
  proof_url: string | null
  created_at: string
  amount_paid?: number
  installment_number?: number
  total_installments?: number
  profiles: { id: string; first_name: string; last_name: string; email: string; phone: string | null; id_number: string | null } | null
  courses: { id?: string; title: string; code: string } | null
}

type PendingGroup = {
  enrollmentId: string
  total: number
  paid: number
  balance: number
  primaryPayment: Payment
  proofUrl: string | null
  totalInstallments: number
}

type ApprovedEnrollment = {
  id: string
  user_id: string
  course_id: string
  status: string
  enrolled_at: string | null
  profiles: { id: string; first_name: string; last_name: string; email: string; phone: string | null; id_number: string | null } | null
  courses: { id?: string; title: string; code: string } | null
  paymentForRecord?: { id: string; total: number; paid: number; balance: number } | null
}

type PendingApplication = {
  id: string
  user_id: string
  course_id: string
  status: string
  created_at: string
  profiles: { id: string; first_name: string; last_name: string; email: string; phone: string | null; id_number: string | null } | null
  courses: { id?: string; title: string; code: string } | null
}

type Student = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  id_number: string | null
  created_at: string
}

export default function StudentsTable({
  pendingGroups, pendingApplications, approvedEnrollments, onHoldEnrollments, rejected, students,
}: {
  pendingGroups: PendingGroup[]; pendingApplications: PendingApplication[]; approvedEnrollments: ApprovedEnrollment[]; onHoldEnrollments: ApprovedEnrollment[]; rejected: Payment[]; students: Student[]
}) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'on_hold' | 'rejected' | 'all'>('pending')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function setEnrollmentStatus(enrollmentId: string, status: 'on_hold' | 'approved') {
    setLoading(true)
    const res = await fetch(`/api/admin/enrollments/${enrollmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    setMessage(res.ok ? (status === 'on_hold' ? 'Course put on hold' : 'Application approved. Student can access the course.') : (data.error || 'Failed'))
    setLoading(false)
    if (res.ok) setTimeout(() => window.location.reload(), 800)
  }

  async function removeStudent(studentId: string, name: string) {
    if (!window.confirm(`Remove ${name}? This deletes their profile and account. They must have no enrollments (run "Clean up orphan data" on Enrollments first if needed).`)) return
    setRemovingId(studentId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${studentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage('Student removed. Refreshing…')
        setTimeout(() => window.location.reload(), 800)
      } else {
        setMessage(data.error || 'Could not remove student.')
      }
    } catch {
      setMessage('Request failed.')
    } finally {
      setRemovingId(null)
    }
  }

  const tabs = [
    { key: 'pending', label: 'Pending', count: pendingApplications.length + pendingGroups.length, color: 'bg-amber-100 text-amber-700' },
    { key: 'approved', label: 'Approved', count: approvedEnrollments.length, color: 'bg-green-100 text-green-700' },
    { key: 'on_hold', label: 'On hold', count: onHoldEnrollments.length, color: 'bg-orange-100 text-orange-700' },
    { key: 'rejected', label: 'Rejected', count: rejected.length, color: 'bg-red-100 text-red-700' },
    { key: 'all', label: 'All Students', count: students.length, color: 'bg-gray-100 text-gray-700' },
  ] as const

  const currentApproved = approvedEnrollments
  const currentOnHold = tab === 'on_hold' ? onHoldEnrollments : []
  const currentRejected = tab === 'rejected' ? rejected : []

  const isError = message && (
    message.toLowerCase().includes('failed') ||
    message.toLowerCase().includes('error') ||
    message.toLowerCase().includes('network error') ||
    message.toLowerCase().includes("couldn't send") ||
    message.toLowerCase().includes('not found') ||
    message.toLowerCase().includes('not linked')
  )
  return (
    <div>
      {message && (
        <div className={`mb-4 text-sm px-4 py-3 rounded-lg ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`} role="alert">
          {message}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-white/20 text-white' : t.color}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab !== 'all' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {tab === 'approved' ? (
            currentApproved.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No approved enrollments</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentApproved.map((e: ApprovedEnrollment) => (
                  <div key={e.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          {e.profiles?.first_name?.charAt(0)}{e.profiles?.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{e.profiles?.first_name} {e.profiles?.last_name}</p>
                          <p className="text-xs text-gray-500">{e.profiles?.email}</p>
                          <p className="text-xs text-gray-400">
                            {e.courses?.title} • {e.courses?.code} • Enrolled {e.enrolled_at ? formatDateShort(e.enrolled_at) : '—'}
                            {e.paymentForRecord && e.paymentForRecord.balance > 0 && (
                              <span> • Total R{formatAmount(e.paymentForRecord.total)}
                                {e.paymentForRecord.paid > 0 && <span> • Paid R{formatAmount(e.paymentForRecord.paid)}</span>}
                                {' • '}Balance R{formatAmount(e.paymentForRecord.balance)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.paymentForRecord && e.paymentForRecord.balance > 0 && (
                          <a href={`/admin/payment-review/${e.paymentForRecord.id}`}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg whitespace-nowrap">Record payment</a>
                        )}
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">approved</span>
                        <button type="button" onClick={() => setEnrollmentStatus(e.id, 'on_hold')} disabled={loading}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded">Put on hold</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'on_hold' ? (
            currentOnHold.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No enrollments on hold</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentOnHold.map((e: ApprovedEnrollment) => (
                  <div key={e.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          {e.profiles?.first_name?.charAt(0)}{e.profiles?.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{e.profiles?.first_name} {e.profiles?.last_name}</p>
                          <p className="text-xs text-gray-500">{e.profiles?.email}</p>
                          <p className="text-xs text-gray-400">{e.courses?.title} • {e.courses?.code}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setEnrollmentStatus(e.id, 'approved')} disabled={loading}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Allow to continue</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'pending' ? (
            (pendingApplications.length === 0 && pendingGroups.length === 0) ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-2">No pending applications</p>
                <p className="text-gray-400 text-xs max-w-sm mx-auto">When a student applies, they appear here. Click <strong>Approve application</strong> to grant them course access.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingApplications.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">Applications (student must submit payment plan and proof first; then they appear under Payment pending)</div>
                    {pendingApplications.map((app: PendingApplication) => (
                      <div key={app.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                              {app.profiles?.first_name?.charAt(0)}{app.profiles?.last_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{app.profiles?.first_name} {app.profiles?.last_name}</p>
                              <p className="text-xs text-gray-500">{app.profiles?.email}</p>
                              <p className="text-xs text-gray-400">{app.courses?.title} • {app.courses?.code} • Applied {formatDateShort(app.created_at)}</p>
                            </div>
                          </div>
                          <span className="text-xs text-amber-600 font-medium">Awaiting payment plan & proof</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {pendingGroups.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment pending (record amount / approve)</div>
                    {pendingGroups.map((g) => {
                  const p = g.primaryPayment
                  return (
                    <div key={g.enrollmentId} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                            {p.profiles?.first_name?.charAt(0)}{p.profiles?.last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.profiles?.first_name} {p.profiles?.last_name}</p>
                            <p className="text-xs text-gray-500">{p.profiles?.email}</p>
                            <p className="text-xs text-gray-400">
                              {p.courses?.title} • {p.courses?.code}
                              {g.totalInstallments > 1 && <span> • {g.totalInstallments} installments</span>}
                              {' • '}Total R{formatAmount(g.total)}
                              {g.paid > 0 && <span> • Paid R{formatAmount(g.paid)}</span>}
                              {g.balance > 0 && <span> • Balance R{formatAmount(g.balance)}</span>}
                              {' • '}{formatDateShort(p?.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 items-center">
                          <a href={`/admin/payment-review/${p.id}`}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg whitespace-nowrap">Record payment</a>
                        </div>
                      </div>
                    </div>
                  )
                })}
                  </>
                )}
              </div>
            )
          ) : currentRejected.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No rejected payments</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {currentRejected.map((p: Payment) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                        {p.profiles?.first_name?.charAt(0)}{p.profiles?.last_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.profiles?.first_name} {p.profiles?.last_name}</p>
                        <p className="text-xs text-gray-500">{p.profiles?.email}</p>
                        <p className="text-xs text-gray-400">{p.courses?.title} • {p.courses?.code} • R{formatAmount(p.amount)} • {formatDateShort(p?.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-red-700">rejected</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No students registered yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">Email: {s.email || '—'}</p>
                      <p className="text-xs text-gray-500">Phone: {s.phone || '—'}</p>
                      <p className="text-xs text-gray-500">ID number: {s.id_number || '—'}</p>
                      <p className="text-xs text-gray-400">Registered {formatDateShort(s?.created_at)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStudent(s.id, [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email)}
                    disabled={removingId !== null}
                    className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {removingId === s.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

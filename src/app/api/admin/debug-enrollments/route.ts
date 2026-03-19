import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PENDING_STATUSES = ['approved', 'rejected', 'on_hold']
function isPending(status: string | null) {
  const s = (status || '').toString().toLowerCase().trim()
  return !s || !PENDING_STATUSES.includes(s)
}

/** GET: Admin-only debug - returns raw enrollment + payment data to diagnose pending approvals. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const [enrollmentsRes, paymentsRes] = await Promise.all([
    service.from('enrollments').select('id, user_id, course_id, status, created_at').order('created_at', { ascending: false }).limit(20),
    service.from('payments').select('id, user_id, enrollment_id, status, amount, created_at').eq('status', 'pending').limit(20),
  ])

  const enrollments = enrollmentsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const pendingEnrollments = enrollments.filter((e: any) => isPending(e.status))
  const pendingCount = pendingEnrollments.length + payments.length

  return NextResponse.json({
    enrollments,
    payments,
    pendingEnrollments,
    pendingCount,
    summary: {
      totalEnrollments: enrollments.length,
      pendingEnrollmentCount: pendingEnrollments.length,
      pendingPaymentCount: payments.length,
      expectedDashboardCount: pendingCount,
    },
    errors: { enrollments: enrollmentsRes.error?.message, payments: paymentsRes.error?.message },
  })
}

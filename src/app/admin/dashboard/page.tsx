import { unstable_noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import DashboardResetButton from '@/components/admin/DashboardResetButton'

export const dynamic = 'force-dynamic'

const PENDING_STATUSES = ['approved', 'rejected', 'on_hold']
function isPendingEnrollment(status: string | null) {
  const s = (status || '').toString().toLowerCase().trim()
  return !s || !PENDING_STATUSES.includes(s)
}

async function getStats(supabase: ReturnType<typeof createServiceClient>) {
  const [students, pendingPaymentsRes, allEnrollments, courses, approvedEnrollmentsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
    supabase.from('payments').select('id, enrollment_id').eq('status', 'pending'),
    supabase.from('enrollments').select('id, status'),
    supabase.from('courses').select('id', { count: 'exact' }).eq('status', 'published'),
    supabase.from('enrollments').select('id').eq('status', 'approved'),
  ])
  const approvedEnrollmentIds = new Set((approvedEnrollmentsRes.data ?? []).map((e: any) => e.id))
  const pendingPayments = (pendingPaymentsRes.data ?? []).filter((p: any) => {
    const eid = p.enrollment_id
    return eid && !approvedEnrollmentIds.has(eid)
  })
  const enrollmentIdsWithPendingPayment = new Set(pendingPayments.map((p: any) => p.enrollment_id).filter(Boolean))
  const pendingEnrollmentCount = (allEnrollments.data ?? []).filter((e: any) => isPendingEnrollment(e.status) && !enrollmentIdsWithPendingPayment.has(e.id)).length
  const pendingApprovals = pendingEnrollmentCount + pendingPayments.length
  return {
    totalStudents: students.count ?? 0,
    pendingApprovals,
    activeCourses: courses.count ?? 0,
    activeEnrollments: (approvedEnrollmentsRes.data ?? []).length,
  }
}

async function getPendingList(supabase: ReturnType<typeof createServiceClient>) {
  const [enrollmentsRes, paymentsRes, approvedRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, status, created_at, user_id, course_id')
      .order('created_at', { ascending: true }),
    supabase
      .from('payments')
      .select(`
        id, proof_url, created_at, amount, enrollment_id,
        profiles:user_id (first_name, last_name, email, id_number),
        courses:course_id (title, code)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20),
    supabase.from('enrollments').select('id').eq('status', 'approved'),
  ])
  const approvedEnrollmentIds = new Set((approvedRes.data ?? []).map((e: any) => e.id))
  const allPendingPayments = paymentsRes.data ?? []
  const pendingPayments = allPendingPayments.filter((p: any) => {
    const eid = p.enrollment_id
    return !eid || !approvedEnrollmentIds.has(eid)
  }).slice(0, 10)
  const enrollmentIdsWithPendingPayment = new Set(pendingPayments.map((p: any) => p.enrollment_id).filter(Boolean))
  const enrollmentRows = (enrollmentsRes.data ?? [])
    .filter((e: any) => isPendingEnrollment(e.status) && !enrollmentIdsWithPendingPayment.has(e.id))
    .slice(0, 10)
  const userIds = Array.from(new Set(enrollmentRows.map((e: any) => e.user_id).filter(Boolean)))
  const courseIds = Array.from(new Set(enrollmentRows.map((e: any) => e.course_id).filter(Boolean)))
  let profilesMap: Record<string, { first_name: string; last_name: string; email: string }> = {}
  let coursesMap: Record<string, { title: string; code: string }> = {}
  if (userIds.length > 0 || courseIds.length > 0) {
    const [profilesRes, coursesRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('profiles').select('id, first_name, last_name, email').in('id', userIds) : Promise.resolve({ data: [] as any[] }),
      courseIds.length > 0 ? supabase.from('courses').select('id, title, code').in('id', courseIds) : Promise.resolve({ data: [] as any[] }),
    ])
    profilesMap = Object.fromEntries((profilesRes.data ?? []).map((p: any) => [p.id, p]))
    coursesMap = Object.fromEntries((coursesRes.data ?? []).map((c: any) => [c.id, c]))
  }
  const applications = enrollmentRows.map((e: any) => ({
    id: e.id,
    status: e.status,
    created_at: e.created_at,
    _type: 'application',
    profiles: profilesMap[e.user_id] ?? null,
    courses: coursesMap[e.course_id] ?? null,
  }))
  const payments = (paymentsRes.data ?? []).map((p: any) => ({ ...p, _type: 'payment' }))
  return { applications, payments }
}

export default async function AdminDashboardPage() {
  unstable_noStore()
  const supabase = createServiceClient()
  const [stats, pending] = await Promise.all([
    getStats(supabase),
    getPendingList(supabase),
  ])
  const pendingList = [...pending.applications, ...pending.payments]

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, color: 'bg-blue-500', icon: '👥' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, color: 'bg-amber-500', icon: '⏳' },
    { label: 'Active Courses', value: stats.activeCourses, color: 'bg-green-500', icon: '📚' },
    { label: 'Active Enrollments', value: stats.activeEnrollments, color: 'bg-purple-500', icon: '✅' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of PBK University LMS</p>
      </div>

      <DashboardResetButton />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span className={`${card.color} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
                {card.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            {card.label === 'Active Courses' && (
              <a href="/admin/courses" className="text-xs text-blue-600 hover:underline font-medium mt-1 inline-block">View courses →</a>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Pending Approvals</h2>
            <p className="text-xs text-gray-500 mt-0.5">Applications (payment link in first email) and payments awaiting review</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/students" className="text-sm text-blue-600 hover:underline font-medium">
              View all
            </a>
          </div>
        </div>

        {pendingList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-medium">No pending approvals</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingList.map((item: any) => (
              <div key={item._type === 'application' ? `app-${item.id}` : item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {[item.profiles?.first_name?.charAt(0), item.profiles?.last_name?.charAt(0)].filter(Boolean).join('') || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {[item.profiles?.first_name, item.profiles?.last_name].filter(Boolean).join(' ') || item.profiles?.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">{item.profiles?.email || (item.user_id ? `User ${item.user_id.slice(0, 8)}…` : '')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.courses?.title} • {formatDate(item.created_at)}
                      {item._type === 'application' && (
                        <span className="ml-1 text-amber-600 font-medium">• Application (no payment yet)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item._type === 'payment' && item.proof_url ? (
                    <a
                      href={item.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View proof
                    </a>
                  ) : item._type === 'payment' ? (
                    <span className="text-xs bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg cursor-not-allowed">
                      No proof yet
                    </span>
                  ) : null}
                  {item._type === 'application' ? (
                    <a
                      href="/admin/students"
                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      Awaiting payment plan
                    </a>
                  ) : (
                    <a
                      href={`/admin/payment-review/${item.id}`}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Record payment
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

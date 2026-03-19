import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import UploadProofOfPayment from '@/components/student/UploadProofOfPayment'
import { formatDate, getPaymentDeadline } from '@/lib/utils'

export default async function StudentDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [enrollmentsRes, certificatesRes, pendingPaymentsRes, outstandingPaymentsRes, enrollmentsWithDates] = await Promise.all([
    supabase.from('enrollments').select('id, status, course_id, enrolled_at, created_at, courses:course_id(title, code, nqf_level, credits)').eq('user_id', user.id).eq('status', 'approved'),
    supabase.from('certificates').select('id, certificate_number, issued_at, courses:course_id(title)').eq('user_id', user.id).order('issued_at', { ascending: false }),
    supabase.from('payments').select('id, status, enrollment_id').eq('user_id', user.id).eq('status', 'pending'),
    createServiceClient().from('payments').select('id, amount, amount_paid, enrollment_id, course_id, total_installments, created_at, courses:course_id(title, code)').eq('user_id', user.id).eq('status', 'pending'),
    createServiceClient().from('enrollments').select('id, enrolled_at, created_at').eq('user_id', user.id),
  ])

  const enrollments = (enrollmentsRes.data ?? []) as any[]
  const certificates = (certificatesRes.data ?? []) as any[]
  const approvedEnrollmentIds = new Set(enrollments.map((e: any) => e.id))
  const pendingPayments = (pendingPaymentsRes.data ?? []) as any[]
  const pendingCount = pendingPayments.filter((p: any) => !p.enrollment_id || !approvedEnrollmentIds.has(p.enrollment_id)).length
  const isReturning = enrollments.length > 0 || certificates.length > 0

  const outstandingPayments = (outstandingPaymentsRes.data ?? []) as any[]
  const withBalance = outstandingPayments
    .filter((p: any) => {
      const total = p.amount ?? 0
      const paid = p.amount_paid ?? 0
      return (total - paid) > 0 && p.enrollment_id && approvedEnrollmentIds.has(p.enrollment_id)
    })
    .map((p: any) => {
      const enrollment = (enrollmentsWithDates?.data ?? []).find((e: any) => e.id === p.enrollment_id)
      const startDate = enrollment?.enrolled_at ?? p.created_at ?? enrollment?.created_at
      const { deadlineStr, isOverdue } = getPaymentDeadline(startDate, p.total_installments ?? 1)
      return {
        id: p.id,
        courseId: p.course_id,
        courseTitle: p.courses?.title,
        courseCode: p.courses?.code,
        total: p.amount ?? 0,
        paid: p.amount_paid ?? 0,
        balance: (p.amount ?? 0) - (p.amount_paid ?? 0),
        enrollmentId: p.enrollment_id,
        totalInstallments: p.total_installments ?? 1,
        paymentDeadline: deadlineStr,
        isOverdue,
      }
    })

  const paymentIds = withBalance.map((p: { id: string }) => p.id)
  const transactionsRes = paymentIds.length > 0
    ? await createServiceClient()
        .from('payment_transactions')
        .select('payment_id, amount, recorded_at')
        .in('payment_id', paymentIds)
        .order('recorded_at', { ascending: false })
    : { data: [] as any[] }
  const transactionsByPayment = (transactionsRes.data ?? []).reduce((acc: Record<string, { amount: number; recorded_at: string }[]>, t: any) => {
    const pid = t.payment_id
    if (!acc[pid]) acc[pid] = []
    acc[pid].push({ amount: t.amount ?? 0, recorded_at: t.recorded_at })
    return acc
  }, {})

  const service = createServiceClient()
  const overdueIds = new Set<string>()
  for (const item of withBalance) {
    if (item.isOverdue && item.balance > 0 && item.enrollmentId) {
      await service.from('enrollments').update({ status: 'on_hold' }).eq('id', item.enrollmentId).eq('status', 'approved')
      overdueIds.add(item.enrollmentId)
    }
  }
  if (overdueIds.size > 0) redirect('/student/dashboard')

  const withBalanceFiltered = withBalance.filter((item: { enrollmentId: string }) => !overdueIds.has(item.enrollmentId))

  const withBalanceAndNext = withBalanceFiltered.map((item: { id: string; courseId: string; courseTitle?: string; courseCode?: string; total: number; paid: number; balance: number; enrollmentId: string; totalInstallments: number; paymentDeadline: string }) => {
    const transactions = transactionsByPayment[item.id] ?? []
    const paymentsMade = transactions.length
    const monthsLeft = Math.max(1, item.totalInstallments - paymentsMade)
    const nextMonthly = monthsLeft > 0 && item.balance > 0 ? Math.ceil(item.balance / monthsLeft) : 0
    return { ...item, nextMonthly, monthsLeft }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isReturning ? 'Welcome back' : 'Welcome'}, {profile?.first_name}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your learning overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Courses', value: enrollments.length, icon: '📚', color: 'bg-blue-50 text-blue-600' },
          { label: 'Certificates', value: certificates.length, icon: '🏆', color: 'bg-green-50 text-green-600' },
          { label: 'Pending Approvals', value: pendingCount, icon: '⏳', color: 'bg-amber-50 text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-xl mb-3`}>{stat.icon}</div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-amber-800">You have {pendingCount} pending payment{pendingCount > 1 ? 's' : ''} awaiting approval.</p>
          <p className="text-xs text-amber-600 mt-1">You will receive an email once approved.</p>
        </div>
      )}

      {withBalanceAndNext.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Payment status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Outstanding balance for your enrolled programme{withBalanceAndNext.length > 1 ? 's' : ''}. Upload proof when you make a payment.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {withBalanceAndNext.map((item: { id: string; courseId: string; courseTitle?: string; courseCode?: string; total: number; paid: number; balance: number; enrollmentId: string; totalInstallments: number; nextMonthly: number; monthsLeft: number; paymentDeadline?: string }) => {
              const transactions = transactionsByPayment[item.id] ?? []
              return (
                <div key={item.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.courseTitle || item.courseCode || 'Course'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Total R{item.total.toLocaleString()}
                        {item.paid > 0 && <span> • Paid R{item.paid.toLocaleString()}</span>}
                        {' • '}<span className="font-semibold text-amber-700">Balance R{item.balance.toLocaleString()}</span>
                      </p>
                      {item.totalInstallments > 1 && item.nextMonthly > 0 && (
                        <p className="text-xs text-amber-700 font-medium mt-1">
                          Next instalment: R{item.nextMonthly.toLocaleString()} (balance ÷ {item.monthsLeft} months left). Stick to this amount.
                        </p>
                      )}
                      {item.paymentDeadline && item.paymentDeadline !== '—' && (
                        <p className="text-xs text-blue-700 font-medium mt-1">
                          Complete all payments by {item.paymentDeadline}. Course access will be put on hold if the balance is not paid by then.
                        </p>
                      )}
                    </div>
                  </div>
                  {transactions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment history</p>
                      <ul className="space-y-1.5 text-sm">
                        {transactions.map((tx, i) => (
                          <li key={i} className="flex justify-between items-center text-gray-700">
                            <span>R{tx.amount.toLocaleString()}</span>
                            <span className="text-gray-500 text-xs">{formatDate(tx.recorded_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <UploadProofOfPayment
                    paymentId={item.id}
                    enrollmentId={item.enrollmentId}
                    courseId={item.courseId}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Courses</h2>
            <Link href="/student/courses" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {enrollments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-sm font-medium text-gray-700 mb-1">No programmes yet</p>
              <p className="text-xs mb-4">Choose a programme and submit your application.</p>
              <Link href="/student/courses" className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Apply for a programme</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {enrollments.slice(0, 4).map((e: any) => (
                <Link key={e.id} href={`/student/courses/${e.course_id}`} className="block p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                    {e.courses?.code?.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.courses?.title}</p>
                    <p className="text-xs text-gray-400">{e.courses?.code} • NQF {e.courses?.nqf_level} • {e.courses?.credits} credits</p>
                  </div>
                  <span className="ml-auto text-xs text-blue-600 font-medium">Open →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Certificates</h2>
            <Link href="/student/certificates" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {certificates.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm">Complete a course to earn your certificate</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {certificates.slice(0, 4).map((c: any) => (
                <div key={c.id} className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-lg shrink-0">🏆</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.courses?.title}</p>
                    <p className="text-xs text-gray-400">{c.certificate_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

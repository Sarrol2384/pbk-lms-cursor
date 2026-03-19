import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PaymentReviewCard from '@/components/admin/PaymentReviewCard'
import { getPaymentDeadline } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function formatAmount(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default async function PaymentReviewPage({
  params,
}: {
  params: { paymentId: string } | Promise<{ paymentId: string }>
}) {
  const { paymentId } = await Promise.resolve(params)
  const supabase = createServiceClient()

  let payment: { id: string; amount?: number; amount_paid?: number; status?: string; proof_url?: string; user_id?: string; course_id?: string; enrollment_id?: string } | null = null

  const baseSelect = 'id, amount, amount_paid, status, proof_url, created_at, user_id, course_id, enrollment_id, total_installments'
  const byId = await supabase.from('payments').select(baseSelect).eq('id', paymentId).single()

  if (byId.data) {
    payment = byId.data as any
  } else {
    const byEnrollment = await supabase.from('payments').select(baseSelect).eq('enrollment_id', paymentId).eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (byEnrollment.data) {
      payment = byEnrollment.data as any
    } else {
      const { data: enrollment } = await supabase.from('enrollments').select('user_id, course_id').eq('id', paymentId).single()
      if (enrollment?.user_id && enrollment?.course_id) {
        const byUserCourse = await supabase.from('payments').select(baseSelect).eq('user_id', enrollment.user_id).eq('course_id', enrollment.course_id).eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle()
        if (byUserCourse.data) {
          const p = byUserCourse.data as any
          payment = p
          if (!p.enrollment_id) {
            await supabase.from('payments').update({ enrollment_id: paymentId }).eq('id', p.id).is('enrollment_id', null)
            p.enrollment_id = paymentId
          }
        }
      }
    }
  }
  if (!payment) {
    const minimalById = await supabase.from('payments').select('id, amount, status, proof_url, user_id, course_id').eq('id', paymentId).single()
    if (minimalById.data) payment = { ...minimalById.data, amount_paid: 0, enrollment_id: null } as any
  }

  if (!payment) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, user_id, course_id, status')
      .eq('id', paymentId)
      .single()

    return (
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">← Back to Students</Link>
          <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="font-medium text-red-900">Payment not found</p>
          <p className="text-sm text-red-700 mt-1">
            {enrollment
              ? 'No payment record exists for this enrollment. The student must submit a payment plan and proof first. They will then appear under Students → Pending.'
              : 'No payment exists with this ID. It may have been processed or the link is outdated. Go to Students → Pending to find payments awaiting approval.'}
          </p>
          <p className="text-xs text-red-600 mt-2">ID: {paymentId}</p>
        </div>
      </div>
    )
  }

  const p = payment as any
  let profiles: { first_name?: string; last_name?: string; email?: string } | null = null
  let courses: { title?: string; code?: string } | null = null
  if (p.user_id) {
    const { data: prof } = await supabase.from('profiles').select('first_name, last_name, email').eq('id', p.user_id).single()
    profiles = prof
  }
  if (p.course_id) {
    const { data: cour } = await supabase.from('courses').select('title, code').eq('id', p.course_id).single()
    courses = cour
  }
  if (p.status !== 'pending') {
    return (
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">← Back to Students</Link>
          <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-medium text-amber-900">This payment has already been processed.</p>
          <p className="text-sm text-amber-700 mt-1">Status: {p.status}</p>
        </div>
      </div>
    )
  }

  const total = p.amount ?? 0
  const paid = p.amount_paid ?? 0
  const balance = total - paid
  const totalInstallments = (p as any).total_installments ?? 1

  const { data: transactions } = await supabase
    .from('payment_transactions')
    .select('amount, recorded_at')
    .eq('payment_id', payment.id)
    .order('recorded_at', { ascending: false })

  const txList = (transactions ?? []) as { amount: number; recorded_at: string }[]
  const paymentsMade = txList.length
  const monthsLeft = Math.max(1, totalInstallments - paymentsMade)
  const nextMonthlyAmount = monthsLeft > 0 && balance > 0 ? Math.ceil(balance / monthsLeft) : 0

  const { data: enrollmentData } = p.enrollment_id
    ? await supabase.from('enrollments').select('enrolled_at, created_at').eq('id', p.enrollment_id).single()
    : { data: null }
  const startDate = (enrollmentData as { enrolled_at?: string })?.enrolled_at ?? p.created_at ?? (enrollmentData as { created_at?: string })?.created_at
  const { deadlineStr: paymentDeadline } = getPaymentDeadline(startDate, totalInstallments)

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
          ← Back to Students
        </Link>
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review payment</h1>
      <p className="text-gray-500 text-sm mb-6">
        Record amount received, approve full payment, or reject.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                {[profiles?.first_name?.charAt(0), profiles?.last_name?.charAt(0)].filter(Boolean).join('') || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {[profiles?.first_name, profiles?.last_name].filter(Boolean).join(' ') || profiles?.email || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">{profiles?.email}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {courses?.title} • {courses?.code}
                  {totalInstallments > 1 && <span> • {totalInstallments} installments</span>}
                  {' • '}Total R{formatAmount(total)}
                  {paid > 0 && <span> • Paid R{formatAmount(paid)}</span>}
                  {balance > 0 && <span> • Balance R{formatAmount(balance)}</span>}
                </p>
                {total <= 0 && totalInstallments > 1 && (
                  <p className="text-xs text-amber-600 mt-1">Course fee not set. Record the first payment amount — it will set the total, or set the fee in Admin → Courses.</p>
                )}
                {totalInstallments > 1 && nextMonthlyAmount > 0 && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Student&apos;s next instalment: R{formatAmount(nextMonthlyAmount)} (balance ÷ {monthsLeft} months left). They should stick to this amount.
                  </p>
                )}
                {paymentDeadline && paymentDeadline !== '—' && (
                  <p className="text-xs text-gray-600 mt-1">
                    Payment deadline: {paymentDeadline}. Course will be put on hold if balance not paid by then.
                  </p>
                )}
              </div>
            </div>
          </div>

          {txList.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment history</p>
              <ul className="space-y-1.5 text-sm">
                {txList.map((tx, i) => (
                  <li key={i} className="flex justify-between items-center text-gray-700">
                    <span>R{tx.amount.toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">{new Date(tx.recorded_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PaymentReviewCard
            paymentId={payment.id}
            proofUrl={p.proof_url}
            balance={balance}
            total={total}
            totalInstallments={(p as any).total_installments ?? 1}
            enrollmentId={p.enrollment_id ?? null}
          />
        </div>
      </div>
    </div>
  )
}

import { Suspense } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPaymentDeadline } from '@/lib/utils'
import EnrollForm from '@/components/student/EnrollForm'
import ResendEmailButton from '@/components/student/ResendEmailButton'
import UploadProofOfPayment from '@/components/student/UploadProofOfPayment'
import CompletePaymentForm from '@/components/student/CompletePaymentForm'
import SavedNotice from '@/components/student/SavedNotice'
import { BANK } from '@/lib/email'

export default async function EnrollPage({ params }: { params: { courseId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase.from('courses').select('*').eq('id', params.courseId).eq('status', 'published').single()
  if (!course) notFound()

  const { data: existing } = await supabase.from('enrollments').select('id, status, enrolled_at, created_at').eq('user_id', user.id).eq('course_id', params.courseId).single()

  let paymentId: string | null = null
  let totalDue = 0
  let paid = 0
  let balance = 0
  let totalInstallments = 1
  let nextInstallment = 0
  let remainingInstallments = 0
  let hasAnyPayment = false
  let paymentCreatedAt: string | null = null
  if (existing?.id) {
    const service = createServiceClient()
    const { data: list } = await service.from('payments').select('id, amount, amount_paid, status, total_installments, created_at').eq('enrollment_id', existing.id).order('installment_number', { ascending: true })
    const paymentsList = list ?? []
    const paymentIds = paymentsList.map((p: { id: string }) => p.id)
    const { data: txList } = paymentIds.length > 0
      ? await service.from('payment_transactions').select('payment_id').in('payment_id', paymentIds)
      : { data: [] as { payment_id: string }[] }
    const txCountByPayment = ((txList ?? []) as { payment_id: string }[]).reduce((acc: Record<string, number>, t) => {
      acc[t.payment_id] = (acc[t.payment_id] ?? 0) + 1
      return acc
    }, {})
    hasAnyPayment = paymentsList.length > 0
    totalDue = paymentsList.reduce((s: number, p: { amount?: number }) => s + (p.amount ?? 0), 0)
    paid = paymentsList.reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid ?? 0), 0)
    balance = totalDue - paid
    totalInstallments = Math.max(1, paymentsList[0]?.total_installments ?? 1)
    const primaryId = paymentsList[0]?.id
    const paymentsMade = primaryId ? (txCountByPayment[primaryId] ?? 0) : 0
    remainingInstallments = Math.max(1, totalInstallments - paymentsMade)
    nextInstallment = remainingInstallments > 0 && balance > 0 ? Math.ceil(balance / remainingInstallments) : balance
    paymentId = primaryId ?? null
    paymentCreatedAt = (paymentsList[0] as { created_at?: string })?.created_at ?? null
  }

  const startDate = (existing as { enrolled_at?: string; created_at?: string })?.enrolled_at ?? paymentCreatedAt ?? (existing as { created_at?: string })?.created_at
  const { deadlineStr: paymentDeadline, isOverdue } = getPaymentDeadline(startDate, totalInstallments)

  if (existing?.status === 'approved' && balance > 0 && isOverdue) {
    const service = createServiceClient()
    await service.from('enrollments').update({ status: 'on_hold' }).eq('id', existing.id).eq('status', 'approved')
    redirect(`/student/enroll/${params.courseId}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <p className="text-gray-500 text-sm mt-1">{course.code} • NQF {course.nqf_level} • {course.credits} credits</p>
      </div>

      {course.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">{course.description}</p>
        </div>
      )}

      <Suspense fallback={null}>
        <SavedNotice />
      </Suspense>

      {existing ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="font-medium text-blue-900">
            {existing.status === 'pending_approval' ? 'Your application has been submitted.' : 'You have already applied for this course.'}
          </p>
          <p className="text-sm text-blue-700 mt-1">Status: <span className="font-semibold capitalize">{existing.status.replace('_', ' ')}</span></p>
          {existing.status === 'approved' && balance <= 0 && (
            <Link href={`/student/courses/${params.courseId}`} className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors">
              Access course →
            </Link>
          )}
          {existing.status === 'approved' && balance > 0 && (
            <div className="mt-4 space-y-4">
              <Link href={`/student/courses/${params.courseId}`} className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors">
                Access course →
              </Link>
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <p className="font-medium text-gray-900 text-sm mb-2">Outstanding balance</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-2">
                  <span>Total: <strong>R{totalDue.toLocaleString()}</strong></span>
                  <span>Paid: <strong className="text-green-700">R{paid.toLocaleString()}</strong></span>
                  <span>Balance: <strong className="text-amber-700">R{balance.toLocaleString()}</strong></span>
                </div>
                <p className="text-xs text-gray-600 mb-3">Upload proof when you make a payment. Admin will verify and record it.</p>
                {totalInstallments > 1 && nextInstallment > 0 && (
                  <p className="text-xs text-amber-700 font-medium mb-3">Pay R{nextInstallment.toLocaleString()} (your next instalment). Stick to this amount — paying differently will recalculate your schedule.</p>
                )}
                {paymentDeadline && paymentDeadline !== '—' && (
                  <p className="text-xs text-blue-700 font-medium mb-3">Complete all payments by {paymentDeadline}. Course access will be put on hold if the balance is not paid by then.</p>
                )}
                <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
              </div>
            </div>
          )}
          {existing.status === 'on_hold' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900">Your course access is on hold.</p>
              <p className="text-sm text-amber-800 mt-1">Please pay the remaining balance or contact admin to allow you to continue.</p>
              {(totalDue > 0 || paymentId) && balance > 0 && (
                <>
                  <p className="text-sm text-amber-800 mt-2">Balance: <strong>R{balance.toLocaleString()}</strong></p>
                  {totalInstallments > 1 && nextInstallment > 0 && (
                    <p className="text-xs text-amber-700 font-medium mt-1">Next instalment: R{nextInstallment.toLocaleString()}. Stick to this amount.</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Upload proof of payment</p>
                    <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
                  </div>
                </>
              )}
            </div>
          )}
          {((existing.status === 'pending_approval' || existing.status === 'payment_pending') && !hasAnyPayment) && (
            <>
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
                <p className="font-medium text-gray-900 text-sm mb-3">Banking details for payment</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Bank</dt><dd className="font-medium text-gray-900">{BANK.name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Account name</dt><dd className="font-medium text-gray-900">{BANK.accountName}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Account number</dt><dd className="font-medium text-gray-900">{BANK.accountNumber}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Branch code</dt><dd className="font-medium text-gray-900">{BANK.branchCode}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Account type</dt><dd className="font-medium text-gray-900">{BANK.accountType}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Reference</dt><dd className="font-medium text-gray-900">{BANK.reference}</dd></div>
                </dl>
              </div>
              <div className="mt-4">
                <CompletePaymentForm enrollmentId={existing.id} courseId={params.courseId} fee={course.fee ?? 0} durationMonths={course.duration_months ?? 12} />
              </div>
              <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
            </>
          )}
          {((existing.status === 'payment_pending' || existing.status === 'pending_approval') && hasAnyPayment) && (
            <>
              {(totalDue > 0 || paymentId) && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
                  <p className="font-medium text-gray-900 text-sm mb-2">Payment plan</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-1">
                    <span>Total: <strong>R{totalDue.toLocaleString()}</strong></span>
                    {paid > 0 && <span>Paid: <strong className="text-green-700">R{paid.toLocaleString()}</strong></span>}
                    {balance > 0 && <span>Balance: <strong>R{balance.toLocaleString()}</strong></span>}
                  </div>
                  {balance > 0 && totalInstallments > 1 && nextInstallment > 0 && (
                    <>
                      <p className="text-xs text-gray-600 mt-1">
                        Next instalment: <strong>R{nextInstallment.toLocaleString()}</strong>
                        {remainingInstallments > 1 && ` (balance ÷ ${remainingInstallments} months left)`}
                      </p>
                      <p className="text-xs text-amber-700 font-medium mt-1">
                        Stick to R{nextInstallment.toLocaleString()}. Paying a different amount will recalculate your monthly schedule.
                      </p>
                      {paymentDeadline && paymentDeadline !== '—' && (
                        <p className="text-xs text-blue-700 font-medium mt-1">Complete all payments by {paymentDeadline}. Course access will be put on hold if not paid by then.</p>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
                <p className="font-medium text-gray-900 text-sm mb-3">Banking details for payment</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Bank</dt><dd className="font-medium text-gray-900">{BANK.name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Account name</dt><dd className="font-medium text-gray-900">{BANK.accountName}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Account number</dt><dd className="font-medium text-gray-900">{BANK.accountNumber}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Branch code</dt><dd className="font-medium text-gray-900">{BANK.branchCode}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Account type</dt><dd className="font-medium text-gray-900">{BANK.accountType}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Reference</dt><dd className="font-medium text-gray-900">{BANK.reference}</dd></div>
                </dl>
              </div>
              <ResendEmailButton userId={user.id} courseId={params.courseId} />
              {balance > 0 ? (
                <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
              ) : (
                <p className="mt-4 text-sm text-green-700">Payment complete. Admin will confirm and grant access shortly.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <EnrollForm course={course} userId={user.id} />
      )}
    </div>
  )
}

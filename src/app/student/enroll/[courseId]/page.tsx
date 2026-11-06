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
import { BankingDetails } from '@/components/student/BankingDetails'
import { TuitionStatusCard } from '@/components/student/TuitionStatusCard'
import { suspendEnrollmentIfOverdue } from '@/lib/enrollment-access'
import { firstInstallmentDue } from '@/lib/tuition'

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
  let firstInstallment = 0
  let hasAnyPayment = false
  let paymentCreatedAt: string | null = null
  if (existing?.id) {
    const service = createServiceClient()
    const { data: list } = await service.from('payments').select('id, amount, amount_paid, status, total_installments, installment_amount, created_at').eq('enrollment_id', existing.id).order('installment_number', { ascending: true })
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
    firstInstallment = firstInstallmentDue(totalDue, totalInstallments, (paymentsList[0] as { installment_amount?: number } | undefined)?.installment_amount)
    const primaryId = paymentsList[0]?.id
    const paymentsMade = primaryId ? (txCountByPayment[primaryId] ?? 0) : 0
    remainingInstallments = Math.max(1, totalInstallments - paymentsMade)
    nextInstallment = remainingInstallments > 0 && balance > 0 ? Math.ceil(balance / remainingInstallments) : balance
    paymentId = primaryId ?? null
    paymentCreatedAt = (paymentsList[0] as { created_at?: string })?.created_at ?? null
  }

  const startDate = (existing as { enrolled_at?: string; created_at?: string })?.enrolled_at ?? paymentCreatedAt ?? (existing as { created_at?: string })?.created_at
  const { deadlineStr: paymentDeadline } = getPaymentDeadline(startDate, totalInstallments)

  if (existing?.status === 'approved' && balance > 0) {
    const held = await suspendEnrollmentIfOverdue({
      id: existing.id,
      status: existing.status,
      enrolled_at: (existing as { enrolled_at?: string }).enrolled_at,
      created_at: (existing as { created_at?: string }).created_at,
    })
    if (held) redirect(`/student/enroll/${params.courseId}`)
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
          {existing.status === 'approved' && balance <= 0 && paid >= firstInstallment && firstInstallment > 0 && (
            <Link href={`/student/courses/${params.courseId}`} className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors">
              Access course →
            </Link>
          )}
          {existing.status === 'approved' && (balance > 0 || paid < firstInstallment) && (
            <div className="mt-4 space-y-4">
              {paid >= firstInstallment && firstInstallment > 0 && (
                <Link href={`/student/courses/${params.courseId}`} className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Access course →
                </Link>
              )}
              <TuitionStatusCard
                heading={paid < firstInstallment ? 'Payment still short of the first instalment' : 'Outstanding balance'}
                totalDue={totalDue}
                paid={paid}
                balance={balance}
                firstInstallment={firstInstallment}
                totalInstallments={totalInstallments}
                nextInstallment={nextInstallment}
                remainingInstallments={remainingInstallments}
                paymentDeadline={paymentDeadline}
              />
              <p className="text-xs text-gray-600">Upload proof when you make a payment. Admin will verify and record the amount received.</p>
              <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
            </div>
          )}
          {existing.status === 'on_hold' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900">Your course access is on hold.</p>
              <p className="text-sm text-amber-800 mt-1">Please pay the remaining balance or contact admin to allow you to continue.</p>
              {(totalDue > 0 || paymentId) && balance > 0 && (
                <>
                  <div className="mt-3">
                    <TuitionStatusCard
                      heading="Balance"
                      totalDue={totalDue}
                      paid={paid}
                      balance={balance}
                      firstInstallment={firstInstallment}
                      totalInstallments={totalInstallments}
                      nextInstallment={nextInstallment}
                      remainingInstallments={remainingInstallments}
                      paymentDeadline={paymentDeadline}
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Upload proof of payment</p>
                    <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
                  </div>
                </>
              )}
            </div>
          )}
          {existing.status === 'pending_approval' && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
              <p className="font-medium text-gray-900 text-sm">Waiting for approval</p>
              <p className="text-sm text-gray-600 mt-1">An administrator must approve your application before you can choose a payment plan or upload proof of payment. We will email you when that happens.</p>
            </div>
          )}
          {existing.status === 'rejected' && (
            <p className="mt-4 text-sm text-gray-700">This application was not approved. Contact support if you would like to discuss it.</p>
          )}
          {(existing.status === 'payment_pending' && !hasAnyPayment) && (
            <>
              <BankingDetails />
              <div className="mt-4">
                <CompletePaymentForm enrollmentId={existing.id} courseId={params.courseId} fee={course.fee ?? 0} durationMonths={course.duration_months ?? 12} />
              </div>
              <UploadProofOfPayment paymentId={paymentId} enrollmentId={existing.id} courseId={params.courseId} />
            </>
          )}
          {(existing.status === 'payment_pending' && hasAnyPayment) && (
            <>
              {(totalDue > 0 || paymentId) && (
                <div className="mt-4">
                  <TuitionStatusCard
                    heading="Payment plan"
                    totalDue={totalDue}
                    paid={paid}
                    balance={balance}
                    firstInstallment={firstInstallment}
                    totalInstallments={totalInstallments}
                    nextInstallment={nextInstallment}
                    remainingInstallments={remainingInstallments}
                    paymentDeadline={paymentDeadline}
                  />
                </div>
              )}
              <BankingDetails />
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

import { createServiceClient } from '@/lib/supabase/server'
import { sendPaymentReceivedEmail, sendWelcomeAccessGrantedEmail } from '@/lib/email'
import { approveEnrollmentFirstTime } from '@/lib/enrollment-access'
import { refreshProgressAndCertificate } from '@/lib/progress'
import { CERTIFICATE_SAVE_ERROR } from '@/lib/certificate-issue'
import {
  accumulatedAmountPaid,
  assessTuition,
  outcomeAfterRecording,
  type PaymentSlice,
} from '@/lib/tuition'

type Service = ReturnType<typeof createServiceClient>

export type RecordTuitionResult =
  | {
      ok: true
      fullyPaid: boolean
      openedAccess: boolean
      partial: boolean
      firstApproval: boolean
      balance: number
      totalPaid: number
      firstInstallment: number
      completionDocumentCreated: boolean
      completionDocumentIssued: boolean
      certificateError?: string
    }
  | { ok: false; status: number; error: string }

/**
 * Record money actually received. amount_paid follows payment_transactions.
 * This never writes the course fee into amount_paid.
 */
export async function recordTuitionReceived(
  service: Service,
  input: { paymentId: string; amountReceived: number; recordedBy: string }
): Promise<RecordTuitionResult> {
  const { paymentId, amountReceived, recordedBy } = input

  let { data: payment, error: fetchErr } = await service
    .from('payments')
    .select('id, enrollment_id, user_id, course_id, amount, amount_paid, total_installments, installment_amount')
    .eq('id', paymentId)
    .single()

  if (fetchErr || !payment) {
    const fallback = await service.from('payments').select('id, user_id, course_id, amount, enrollment_id').eq('id', paymentId).single()
    if (!fallback.data) return { ok: false, status: 404, error: 'Payment not found' }
    const fd = fallback.data as {
      id: string
      user_id: string
      course_id: string
      amount: number | null
      enrollment_id?: string | null
    }
    payment = {
      id: fd.id,
      user_id: fd.user_id,
      course_id: fd.course_id,
      amount: fd.amount,
      enrollment_id: fd.enrollment_id ?? null,
      amount_paid: 0,
      total_installments: 1,
      installment_amount: 0,
    }
  }

  if (!payment.enrollment_id && payment.user_id && payment.course_id) {
    const { data: enrollment } = await service
      .from('enrollments')
      .select('id')
      .eq('user_id', payment.user_id)
      .eq('course_id', payment.course_id)
      .limit(1)
      .maybeSingle()
    if (enrollment?.id) {
      await service.from('payments').update({ enrollment_id: enrollment.id }).eq('id', paymentId)
      payment = { ...payment, enrollment_id: enrollment.id }
    }
  }
  if (!payment.enrollment_id) {
    return { ok: false, status: 400, error: 'Payment not linked to enrollment. Run Sync payments on Students page first.' }
  }

  let amountToUse = payment.amount ?? 0
  if (amountToUse <= 0 && payment.course_id) {
    const { data: course } = await service.from('courses').select('fee').eq('id', payment.course_id).single()
    const fee = course?.fee ?? 0
    if (fee > 0) {
      await service.from('payments').update({ amount: fee }).eq('id', paymentId)
      amountToUse = fee
    } else {
      amountToUse = amountReceived
      await service.from('payments').update({ amount: amountReceived }).eq('id', paymentId)
    }
    payment = { ...payment, amount: amountToUse }
  }

  const previousPaid = payment.amount_paid ?? 0
  const { data: txRow, error: txErr } = await service
    .from('payment_transactions')
    .insert({
      payment_id: paymentId,
      amount: amountReceived,
      recorded_by: recordedBy,
    })
    .select('id')
    .single()

  if (txErr || !txRow) {
    return { ok: false, status: 500, error: txErr?.message || 'Could not record the payment transaction' }
  }

  const { data: txList, error: sumErr } = await service
    .from('payment_transactions')
    .select('amount')
    .eq('payment_id', paymentId)
  if (sumErr) {
    await service.from('payment_transactions').delete().eq('id', txRow.id)
    return { ok: false, status: 500, error: sumErr.message }
  }
  const txSum = (txList ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const newAmountPaid = accumulatedAmountPaid(previousPaid, txSum, amountReceived)

  const { error: updateErr } = await service.from('payments').update({ amount_paid: newAmountPaid }).eq('id', paymentId)
  if (updateErr) {
    await service.from('payment_transactions').delete().eq('id', txRow.id)
    return { ok: false, status: 500, error: updateErr.message }
  }

  const { data: enrollmentRow } = await service
    .from('enrollments')
    .select('id, status, enrolled_at')
    .eq('id', payment.enrollment_id)
    .single()

  const { data: allPayments } = await service
    .from('payments')
    .select('amount, amount_paid, total_installments, installment_amount')
    .eq('enrollment_id', payment.enrollment_id)
    .order('installment_number', { ascending: true })

  const position = assessTuition((allPayments ?? []) as PaymentSlice[])
  const outcome = outcomeAfterRecording(position, { welcomeAlreadySent: !!enrollmentRow?.enrolled_at })

  let firstApproval = false
  if (outcome.openCourse) {
    try {
      const result = await approveEnrollmentFirstTime(payment.enrollment_id)
      firstApproval = result.firstApproval
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not approve enrolment'
      return {
        ok: false,
        status: 500,
        error: `Payment amount was saved, but course access was not updated. Do not record it again. ${message}`,
      }
    }
  }

  if (outcome.markPaymentsApproved) {
    await service.from('payments').update({ status: 'approved' }).eq('enrollment_id', payment.enrollment_id)
  }

  const { data: studentProfile } = await service.from('profiles').select('first_name, email').eq('id', payment.user_id).single()
  const { data: course } = await service.from('courses').select('title').eq('id', payment.course_id).single()
  const balanceAfter = Math.max(0, position.balance)

  if (studentProfile?.email && course?.title) {
    try {
      await sendPaymentReceivedEmail(
        studentProfile.email,
        studentProfile.first_name,
        course.title,
        amountReceived,
        balanceAfter,
        { courseOpen: outcome.openCourse }
      )
    } catch {
      console.error('[Record payment] Payment received email failed')
    }
    if (outcome.sendWelcome && firstApproval) {
      try {
        await sendWelcomeAccessGrantedEmail(studentProfile.email, studentProfile.first_name, course.title)
      } catch {
        console.error('[Record payment] Welcome email failed')
      }
    }
  }

  let completionDocumentCreated = false
  let completionDocumentIssued = false
  let certificateError: string | undefined
  if (position.fullyPaid && payment.user_id && payment.course_id) {
    try {
      const completion = await refreshProgressAndCertificate(payment.user_id, payment.course_id)
      completionDocumentCreated = completion.created
      completionDocumentIssued = !!completion.certificateId
      if (!completion.ok) certificateError = completion.error ?? CERTIFICATE_SAVE_ERROR
    } catch {
      console.error('[certificate] refresh failed')
      certificateError = CERTIFICATE_SAVE_ERROR
    }
  }

  return {
    ok: true,
    fullyPaid: position.fullyPaid,
    openedAccess: outcome.openCourse,
    partial: outcome.partialNotice,
    firstApproval: outcome.sendWelcome && firstApproval,
    balance: balanceAfter,
    totalPaid: position.totalPaid,
    firstInstallment: position.firstInstallment,
    completionDocumentCreated,
    completionDocumentIssued,
    certificateError,
  }
}

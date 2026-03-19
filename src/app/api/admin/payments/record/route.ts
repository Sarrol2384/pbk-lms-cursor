import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWelcomeAccessGrantedEmail, sendPaymentReceivedEmail } from '@/lib/email'

/** POST: admin records amount received (adds to amount_paid). When fully paid, approves enrollment and sends welcome email. */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const paymentId = body.paymentId as string | undefined
  const amountReceived = typeof body.amountReceived === 'number' && body.amountReceived > 0
    ? Math.round(body.amountReceived)
    : undefined

  if (!paymentId || amountReceived === undefined) {
    return NextResponse.json({ error: 'paymentId and amountReceived (number > 0) required' }, { status: 400 })
  }

  const service = createServiceClient()

  let { data: payment, error: fetchErr } = await service
    .from('payments')
    .select('id, enrollment_id, user_id, course_id, amount, amount_paid')
    .eq('id', paymentId)
    .single()

  if (fetchErr || !payment) {
    const fallback = await service.from('payments').select('id, user_id, course_id, amount').eq('id', paymentId).single()
    if (fallback.data) {
      const fd = fallback.data as any
      payment = { id: fd.id, user_id: fd.user_id, course_id: fd.course_id, amount: fd.amount, enrollment_id: fd.enrollment_id ?? null, amount_paid: fd.amount_paid ?? 0 }
    } else {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
  }

  if (!payment.enrollment_id && payment.user_id && payment.course_id) {
    const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', payment.user_id).eq('course_id', payment.course_id).limit(1).maybeSingle()
    if (enrollment?.id) {
      await service.from('payments').update({ enrollment_id: enrollment.id }).eq('id', paymentId)
      payment = { ...payment, enrollment_id: enrollment.id }
    }
  }
  if (!payment.enrollment_id) return NextResponse.json({ error: 'Payment not linked to enrollment. Run Sync payments on Students page first.' }, { status: 400 })

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
  }

  const newAmountPaid = (payment.amount_paid ?? 0) + amountReceived

  const [{ error: updateErr }, { error: txErr }] = await Promise.all([
    service.from('payments').update({ amount_paid: newAmountPaid }).eq('id', paymentId),
    service.from('payment_transactions').insert({
      payment_id: paymentId,
      amount: amountReceived,
      recorded_by: user.id,
    }),
  ])

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  if (txErr) console.error('[Record payment] Failed to insert transaction:', txErr)

  const { data: allPayments } = await service
    .from('payments')
    .select('amount, amount_paid')
    .eq('enrollment_id', payment.enrollment_id)

  const totalDue = (allPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalPaid = (allPayments ?? []).reduce((s, p) => s + (p.amount_paid ?? 0), 0)
  const fullyPaid = totalPaid >= totalDue

  const balanceAfter = Math.max(0, totalDue - totalPaid)
  const { data: studentProfile } = await service.from('profiles').select('first_name, email').eq('id', payment.user_id).single()
  const { data: course } = await service.from('courses').select('title').eq('id', payment.course_id).single()

  if (studentProfile?.email && course?.title) {
    try {
      await sendPaymentReceivedEmail(studentProfile.email, studentProfile.first_name, course.title, amountReceived, balanceAfter)
    } catch (e) {
      console.error('[Record payment] Payment received email failed:', e)
    }
  }

  const firstPaymentReceived = totalPaid > 0
  const enrollmentNotYetApproved = !fullyPaid && firstPaymentReceived

  if (fullyPaid) {
    await Promise.all([
      service.from('payments').update({ status: 'approved' }).eq('enrollment_id', payment.enrollment_id),
      service.from('enrollments').update({ status: 'approved', enrolled_at: new Date().toISOString() }).eq('id', payment.enrollment_id),
    ])
    if (studentProfile?.email && course?.title) {
      try {
        await sendWelcomeAccessGrantedEmail(studentProfile.email, studentProfile.first_name, course.title)
      } catch (e) {
        console.error('[Record payment] Welcome email failed:', e)
      }
    }
  } else if (enrollmentNotYetApproved) {
    const { data: currentEnrollment } = await service.from('enrollments').select('status').eq('id', payment.enrollment_id).single()
    if (currentEnrollment?.status !== 'approved') {
      await service.from('enrollments').update({ status: 'approved', enrolled_at: new Date().toISOString() }).eq('id', payment.enrollment_id)
      if (studentProfile?.email && course?.title) {
        try {
          await sendWelcomeAccessGrantedEmail(studentProfile.email, studentProfile.first_name, course.title)
        } catch (e) {
          console.error('[Record payment] Welcome email failed:', e)
        }
      }
    }
  }

  return NextResponse.json({ success: true, fullyPaid })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWelcomeAccessGrantedEmail } from '@/lib/email'
import { approveEnrollmentFirstTime } from '@/lib/enrollment-access'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { paymentId } = await request.json()
  const service = createServiceClient()

  let { data: payment } = await service.from('payments').select('user_id, course_id, enrollment_id, amount, amount_paid').eq('id', paymentId).single()
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  if (!payment.enrollment_id && payment.user_id && payment.course_id) {
    const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', payment.user_id).eq('course_id', payment.course_id).limit(1).maybeSingle()
    if (enrollment?.id) {
      await service.from('payments').update({ enrollment_id: enrollment.id }).eq('id', paymentId)
      payment = { ...payment, enrollment_id: enrollment.id }
    }
  }
  if (!payment.enrollment_id) return NextResponse.json({ error: 'Payment not linked to enrollment' }, { status: 400 })

  const amount = payment.amount ?? 0
  const amountPaid = payment.amount_paid ?? 0
  const markFullyPaid = amountPaid < amount

  const { error: payErr } = await service.from('payments').update({
    status: 'approved',
    ...(markFullyPaid ? { amount_paid: amount } : {}),
  }).eq('id', paymentId)
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  let firstApproval = false
  try {
    const result = await approveEnrollmentFirstTime(payment.enrollment_id)
    firstApproval = result.firstApproval
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not approve enrolment'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: studentProfile } = await service.from('profiles').select('first_name, email').eq('id', payment.user_id).single()
  const { data: course } = await service.from('courses').select('title').eq('id', payment.course_id).single()

  if (firstApproval && studentProfile?.email && course?.title) {
    try {
      await sendWelcomeAccessGrantedEmail(studentProfile.email, studentProfile.first_name, course.title)
    } catch {
      console.error('[Approve payment] Welcome email failed')
    }
  }

  return NextResponse.json({ success: true })
}

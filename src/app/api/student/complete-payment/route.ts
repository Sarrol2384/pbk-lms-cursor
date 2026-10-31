import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** POST: student creates a payment row after an admin has approved the application (payment_pending). */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const enrollmentId = body.enrollmentId as string | undefined
  const courseId = body.courseId as string | undefined
  const totalInstallments = typeof body.totalInstallments === 'number' && [1, 3, 6, 12].includes(body.totalInstallments)
    ? body.totalInstallments
    : undefined

  if (!enrollmentId || !courseId || totalInstallments === undefined) {
    return NextResponse.json({ error: 'enrollmentId, courseId and totalInstallments (1, 3, 6 or 12) required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: enrollment, error: enrollErr } = await service
    .from('enrollments')
    .select('id, user_id, course_id, status')
    .eq('id', enrollmentId)
    .single()

  if (enrollErr || !enrollment || enrollment.user_id !== user.id) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }
  if (enrollment.course_id !== courseId) {
    return NextResponse.json({ error: 'Course does not match this enrolment' }, { status: 400 })
  }
  if (enrollment.status !== 'payment_pending') {
    return NextResponse.json({ error: 'Your application must be approved before you can choose a payment plan' }, { status: 400 })
  }

  const { data: existing } = await service.from('payments').select('id').eq('enrollment_id', enrollmentId).limit(1).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Payment plan already submitted', paymentId: existing.id }, { status: 400 })

  const { data: course } = await service.from('courses').select('fee').eq('id', enrollment.course_id).single()
  const fee = course?.fee ?? 0
  const installmentAmount = totalInstallments > 1 ? Math.ceil(fee / totalInstallments) : fee

  const { data: payment, error: payErr } = await service
    .from('payments')
    .insert({
      user_id: user.id,
      course_id: enrollment.course_id,
      enrollment_id: enrollmentId,
      amount: fee,
      status: 'pending',
      installment_number: 1,
      installment_months: totalInstallments,
      total_installments: totalInstallments,
      installment_amount: installmentAmount,
    })
    .select('id')
    .single()

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })
  return NextResponse.json({ success: true, paymentId: payment.id })
}

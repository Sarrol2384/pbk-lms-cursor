import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const enrollmentId = searchParams.get('enrollmentId')
  const courseId = searchParams.get('courseId')
  if (!enrollmentId || !courseId) return NextResponse.json({ error: 'enrollmentId and courseId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: enrollment } = await service.from('enrollments').select('id, user_id, course_id').eq('id', enrollmentId).single()
  if (!enrollment || enrollment.user_id !== user.id) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  const { data: existingPayment } = await service.from('payments').select('id').eq('enrollment_id', enrollmentId).eq('status', 'pending').maybeSingle()
  if (existingPayment?.id) return NextResponse.json({ paymentId: existingPayment.id })

  const { data: course } = await service.from('courses').select('fee').eq('id', courseId).single()
  const amount = course?.fee ?? 0

  const { data: created, error } = await service.from('payments').insert({
    user_id: user.id,
    course_id: courseId,
    enrollment_id: enrollmentId,
    amount,
    status: 'pending',
    installment_number: 1,
    installment_months: 1,
    total_installments: 1,
    installment_amount: amount,
  }).select('id').single()

  if (error || !created) return NextResponse.json({ error: error?.message || 'Could not create payment' }, { status: 500 })
  return NextResponse.json({ paymentId: created.id })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** Lookup the pending payment for an approved application. Does not create a plan. */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const enrollmentId = searchParams.get('enrollmentId')
  const courseId = searchParams.get('courseId')
  if (!enrollmentId || !courseId) return NextResponse.json({ error: 'enrollmentId and courseId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: enrollment } = await service
    .from('enrollments')
    .select('id, user_id, course_id, status')
    .eq('id', enrollmentId)
    .single()
  if (!enrollment || enrollment.user_id !== user.id) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  if (enrollment.course_id !== courseId) return NextResponse.json({ error: 'Course does not match this enrolment' }, { status: 400 })
  if (enrollment.status !== 'payment_pending' && enrollment.status !== 'approved' && enrollment.status !== 'on_hold') {
    return NextResponse.json({ error: 'Your application must be approved before you can upload proof of payment' }, { status: 400 })
  }

  const { data: existingPayment } = await service
    .from('payments')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingPayment?.id) return NextResponse.json({ paymentId: existingPayment.id })

  return NextResponse.json({ error: 'Save your payment plan before uploading proof of payment' }, { status: 400 })
}

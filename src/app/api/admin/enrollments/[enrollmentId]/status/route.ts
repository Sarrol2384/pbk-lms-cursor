import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWelcomeAccessGrantedEmail } from '@/lib/email'
import { approveEnrollmentFirstTime } from '@/lib/enrollment-access'

/** PATCH: admin sets enrollment status to on_hold or approved (e.g. "Allow to continue"). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { enrollmentId: string } | Promise<{ enrollmentId: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { enrollmentId } = await Promise.resolve(params)
  if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const status = body.status === 'on_hold' ? 'on_hold' : body.status === 'approved' ? 'approved' : undefined
  if (!status) return NextResponse.json({ error: 'status must be on_hold or approved' }, { status: 400 })

  const service = createServiceClient()
  const { data: enrollment, error: fetchErr } = await service
    .from('enrollments')
    .select('id, status, user_id, course_id')
    .eq('id', enrollmentId)
    .single()

  if (fetchErr || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  if (status === 'approved') {
    const { data: payments } = await service.from('payments').select('id, status').eq('enrollment_id', enrollmentId)
    const pending = (payments ?? []).filter((p: { status: string }) => p.status === 'pending')
    const anyPayments = (payments ?? []).length > 0
    const liftingHold = enrollment.status === 'on_hold'
    // Outstanding instalments stay pending until they are paid. Lifting a hold must still be allowed.
    if (!liftingHold && pending.length > 0) {
      return NextResponse.json({ error: 'Record the payment first. Use Record payment to verify and record the amount received.' }, { status: 400 })
    }
    if (!anyPayments) {
      return NextResponse.json({ error: 'Student must submit a payment plan and proof first. Grant access only after recording payment.' }, { status: 400 })
    }

    let firstApproval = false
    try {
      const result = await approveEnrollmentFirstTime(enrollmentId)
      firstApproval = result.firstApproval
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not update enrolment'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (firstApproval && enrollment.user_id && enrollment.course_id) {
      const { data: studentProfile } = await service.from('profiles').select('first_name, email').eq('id', enrollment.user_id).single()
      const { data: course } = await service.from('courses').select('title').eq('id', enrollment.course_id).single()
      if (studentProfile?.email && course?.title) {
        try {
          await sendWelcomeAccessGrantedEmail(studentProfile.email, studentProfile.first_name, course.title)
        } catch {
          console.error('[Approve enrollment] Welcome email failed')
        }
      }
    }

    return NextResponse.json({ success: true })
  }

  const { error: updateErr } = await service.from('enrollments').update({ status }).eq('id', enrollmentId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

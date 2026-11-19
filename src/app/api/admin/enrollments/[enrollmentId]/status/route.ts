import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWelcomeAccessGrantedEmail } from '@/lib/email'
import { approveEnrollmentFirstTime } from '@/lib/enrollment-access'
import { assessTuition, manualGrantAllowed, type PaymentSlice } from '@/lib/tuition'

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
  const withOverride = await service
    .from('enrollments')
    .select('id, status, user_id, course_id, enrolled_at, access_override')
    .eq('id', enrollmentId)
    .single()

  let enrollment = withOverride.data as {
    id: string
    status: string
    user_id: string
    course_id: string
    enrolled_at?: string | null
    access_override?: boolean | null
  } | null
  let overrideColumn = !withOverride.error
  if (withOverride.error && /access_override|column/i.test(withOverride.error.message ?? '')) {
    const basic = await service
      .from('enrollments')
      .select('id, status, user_id, course_id, enrolled_at')
      .eq('id', enrollmentId)
      .single()
    enrollment = basic.data ? { ...basic.data, access_override: false } : null
    overrideColumn = false
    if (basic.error || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  } else if (withOverride.error || !enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  if (status === 'approved') {
    const { data: payments } = await service
      .from('payments')
      .select('amount, amount_paid, total_installments, installment_amount')
      .eq('enrollment_id', enrollmentId)
      .order('installment_number', { ascending: true })
    const position = assessTuition((payments ?? []) as PaymentSlice[])
    const liftingHold = enrollment.status === 'on_hold'
    const decision = manualGrantAllowed({
      enrollmentStatus: enrollment.status,
      position,
      override: body.override === true,
      liftingHold,
      hadLegitimateAccess: position.meetsFirstInstallment || enrollment.access_override === true,
    })
    if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: 400 })

    if (decision.recordOverride) {
      const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
      if (reason.length < 3) {
        return NextResponse.json({ error: 'An explicit admin override requires a short reason.' }, { status: 400 })
      }
      if (!overrideColumn) {
        return NextResponse.json({
          error: 'Access override could not be saved. Apply the enrollment override migration, then try again. Course access was not changed.',
        }, { status: 503 })
      }
      const { error: overrideErr } = await service.from('enrollments').update({
        access_override: true,
        access_override_at: new Date().toISOString(),
        access_override_by: user.id,
        access_override_reason: reason.slice(0, 500),
      }).eq('id', enrollmentId)
      if (overrideErr) {
        return NextResponse.json({
          error: 'Access override could not be saved. Apply the enrollment override migration, then try again. Course access was not changed.',
        }, { status: 503 })
      }
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

    return NextResponse.json({ success: true, override: decision.recordOverride })
  }

  const { error: updateErr } = await service.from('enrollments').update({ status }).eq('id', enrollmentId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

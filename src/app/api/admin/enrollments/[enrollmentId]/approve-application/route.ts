import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendApplicationApprovedEmail } from '@/lib/email'

/** POST: admin approves the application; enrollment moves to payment_pending and student gets email with link to choose plan + upload proof. */
export async function POST(
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

  const service = createServiceClient()
  const { data: enrollment, error: fetchErr } = await service
    .from('enrollments')
    .select('id, user_id, course_id, status')
    .eq('id', enrollmentId)
    .single()

  if (fetchErr || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  const status = (enrollment.status || '').toString().toLowerCase().trim()
  if (['approved', 'rejected', 'on_hold'].includes(status)) {
    return NextResponse.json({ error: 'Enrollment is not pending approval' }, { status: 400 })
  }

  const { error: updateErr } = await service
    .from('enrollments')
    .update({ status: 'payment_pending' })
    .eq('id', enrollmentId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const { data: studentProfile } = await service.from('profiles').select('first_name, email').eq('id', enrollment.user_id).single()
  let email = studentProfile?.email ?? null
  let firstName = studentProfile?.first_name ?? 'Student'
  if (!email) {
    const { data: authUser } = await service.auth.admin.getUserById(enrollment.user_id)
    if (authUser?.user?.email) {
      email = authUser.user.email
      await service.from('profiles').update({ email }).eq('id', enrollment.user_id)
    }
  }
  const { data: course } = await service.from('courses').select('title').eq('id', enrollment.course_id).single()
  let emailSent = false
  let emailError: string | undefined
  if (email && course?.title) {
    try {
      console.log('[Approve application] Sending to', email, 'for', course.title)
      await sendApplicationApprovedEmail(email, firstName || 'Student', course.title, enrollment.course_id)
      emailSent = true
      console.log('[Approve application] Email sent successfully')
    } catch (e) {
      console.error('[Approve application] Email failed:', e)
      emailError = e instanceof Error ? e.message : 'Email failed'
    }
  } else if (!email) {
    emailError = 'No email found for student'
  }

  return NextResponse.json({ success: true, emailSent, emailError })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendApplicationApprovedEmail } from '@/lib/email'

/** POST: Resend the approval email (payment plan link) to the student. */
export async function POST(
  request: NextRequest,
  { params }: { params: { enrollmentId: string } | Promise<{ enrollmentId: string }> }
) {
  try {
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
    if (!['pending_approval', 'payment_pending'].includes(status)) {
      return NextResponse.json({ error: 'Can only resend for pending or payment_pending enrollments' }, { status: 400 })
    }

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

    if (!email || !course?.title) {
      return NextResponse.json({ error: 'No email found for student' }, { status: 400 })
    }

    try {
      await sendApplicationApprovedEmail(email, firstName || 'Student', course.title, enrollment.course_id)
      return NextResponse.json({ success: true, emailSent: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Email failed'
      console.error('[Resend approval email] Failed:', msg, e)
      const hint = /couldn't send|contact support/i.test(msg)
        ? ' Ensure BREVO_FROM_EMAIL in .env.local matches your verified Brevo sender (e.g. info@pbkleadership.org.za).'
        : ''
      return NextResponse.json({
        error: msg + hint,
        emailSent: false,
      }, { status: 500 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[Resend approval email] Unexpected:', msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

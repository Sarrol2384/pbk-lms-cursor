import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendRegistrationRejectedEmail } from '@/lib/email'

/** POST: admin rejects an application that has not been granted course access. */
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

  const body = await request.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })

  const service = createServiceClient()
  const { data: enrollment, error: fetchErr } = await service
    .from('enrollments')
    .select('id, user_id, course_id, status')
    .eq('id', enrollmentId)
    .single()

  if (fetchErr || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  const status = (enrollment.status || '').toString().toLowerCase().trim()
  if (!['pending_approval', 'payment_pending', 'pending', ''].includes(status)) {
    return NextResponse.json({ error: 'Only applications that are not yet active can be rejected' }, { status: 400 })
  }

  const { error: updateErr } = await service.from('enrollments').update({ status: 'rejected' }).eq('id', enrollmentId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const { data: studentProfile } = await service.from('profiles').select('first_name, email').eq('id', enrollment.user_id).single()
  let emailSent = false
  if (studentProfile?.email) {
    try {
      await sendRegistrationRejectedEmail(studentProfile.email, studentProfile.first_name || 'Student', reason)
      emailSent = true
    } catch (e) {
      console.error('[Reject application] Email failed')
    }
  }

  return NextResponse.json({ success: true, emailSent })
}

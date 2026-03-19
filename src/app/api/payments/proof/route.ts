import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendAdminProofUploadedEmail } from '@/lib/email'

async function getAdminNotifyEmails(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const env = process.env.ADMIN_NOTIFY_EMAIL?.trim()
  if (env) return env.split(',').map((e) => e.trim()).filter(Boolean)
  const { data } = await supabase.from('profiles').select('email').in('role', ['super_admin', 'admin'])
  return (data ?? []).map((p) => p.email).filter((e): e is string => !!e)
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentId, proofUrl } = await request.json()
  if (!paymentId || !proofUrl || typeof proofUrl !== 'string') {
    return NextResponse.json({ error: 'paymentId and proofUrl required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: payment, error: fetchError } = await service
    .from('payments')
    .select('id, user_id, course_id, status')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.user_id !== user.id) return NextResponse.json({ error: 'Not your payment' }, { status: 403 })
  if (payment.status !== 'pending') return NextResponse.json({ error: 'Proof can only be added to pending payments' }, { status: 400 })

  const { error: updateError } = await service
    .from('payments')
    .update({ proof_url: proofUrl })
    .eq('id', paymentId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const adminEmails = await getAdminNotifyEmails(service)
  if (adminEmails.length > 0) {
    const { data: profile } = await service.from('profiles').select('first_name, last_name, email').eq('id', payment.user_id).single()
    const { data: course } = await service.from('courses').select('title').eq('id', payment.course_id).single()
    const studentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student'
    const studentEmail = profile?.email ?? ''
    const courseName = course?.title ?? 'Course'
    for (const to of adminEmails) {
      try {
        await sendAdminProofUploadedEmail(to, studentName, studentEmail, courseName, proofUrl)
      } catch (e) {
        console.error('[Proof] Admin notification failed for', to, e)
      }
    }
  }

  return NextResponse.json({ success: true })
}

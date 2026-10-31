import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendAdminProofUploadedEmail } from '@/lib/email'
import { ownPaymentProofPath } from '@/lib/storage/signed-url'

async function getAdminNotifyEmails(_supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const raw = process.env.ADMIN_NOTIFY_EMAIL?.trim() || 'info@pbkleadership.org.za'
  return Array.from(new Set(raw.split(',').map((part) => part.trim()).filter(Boolean)))
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentId, proofUrl } = await request.json()
  if (!paymentId || !proofUrl || typeof proofUrl !== 'string') {
    return NextResponse.json({ error: 'paymentId and proofUrl required' }, { status: 400 })
  }

  const proofPath = ownPaymentProofPath(user.id, proofUrl)
  if (!proofPath) {
    return NextResponse.json({ error: 'Proof must be a file you uploaded' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: payment, error: fetchError } = await service
    .from('payments')
    .select('id, user_id, course_id, enrollment_id, status')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.user_id !== user.id) return NextResponse.json({ error: 'Not your payment' }, { status: 403 })
  if (payment.status !== 'pending') return NextResponse.json({ error: 'Proof can only be added to pending payments' }, { status: 400 })

  if (payment.enrollment_id) {
    const { data: enrollment } = await service.from('enrollments').select('status').eq('id', payment.enrollment_id).maybeSingle()
    const enrollmentStatus = enrollment?.status
    if (enrollmentStatus && !['payment_pending', 'approved', 'on_hold'].includes(enrollmentStatus)) {
      return NextResponse.json({ error: 'Your application must be approved before you can upload proof of payment' }, { status: 400 })
    }
  }

  const { error: fileErr } = await service.storage.from('payments').download(proofPath)
  if (fileErr) return NextResponse.json({ error: 'Proof file not found. Upload it again.' }, { status: 400 })

  const { error: updateError } = await service
    .from('payments')
    .update({ proof_url: proofPath })
    .eq('id', paymentId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const adminEmails = await getAdminNotifyEmails(service)
  if (adminEmails.length > 0) {
    const { data: profile } = await service.from('profiles').select('first_name, last_name, email').eq('id', payment.user_id).single()
    const { data: course } = await service.from('courses').select('title').eq('id', payment.course_id).single()
    const studentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student'
    const studentEmail = profile?.email ?? ''
    const courseName = course?.title ?? 'Course'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const reviewUrl = `${appUrl}/admin/payment-review/${paymentId}`
    for (const to of adminEmails) {
      try {
        await sendAdminProofUploadedEmail(to, studentName, studentEmail, courseName, reviewUrl)
      } catch {
        console.error('[Proof] Admin notification failed')
      }
    }
  }

  return NextResponse.json({ success: true })
}

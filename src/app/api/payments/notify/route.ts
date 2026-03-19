import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendApplicationReceivedEmail, sendAdminApplicationSubmittedEmail } from '@/lib/email'

async function getAdminNotifyEmails(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const env = process.env.ADMIN_NOTIFY_EMAIL?.trim()
  if (env) return env.split(',').map((e) => e.trim()).filter(Boolean)
  const { data } = await supabase.from('profiles').select('email').in('role', ['super_admin', 'admin'])
  return (data ?? []).map((p) => p.email).filter((e): e is string => !!e)
}

export async function POST(request: NextRequest) {
  try {
    const { userId, courseId, applicationOnly } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabase = createServiceClient()

    let email: string | null = null
    let firstName = 'Student'

    const { data: profile } = await supabase.from('profiles').select('first_name, last_name, email').eq('id', userId).single()
    if (profile) {
      firstName = profile.first_name || firstName
      email = profile.email || null
    }
    if (!email) {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (user?.email) {
        email = user.email
        await supabase.from('profiles').update({ email }).eq('id', userId)
      }
    }
    if (!email) return NextResponse.json({ error: 'No email found for user' }, { status: 400 })

    let courseName = 'your selected course'
    if (courseId) {
      const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single()
      if (course) courseName = course.title
    }

    console.log('[Notify] Sending application email to', email, 'for course', courseName)
    await sendApplicationReceivedEmail(email, firstName, courseName, applicationOnly === true, courseId ?? undefined)
    console.log('[Notify] Email sent successfully to', email)

    const adminEmails = await getAdminNotifyEmails(supabase)
    const studentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || firstName || 'Student'
    for (const to of adminEmails) {
      try {
        await sendAdminApplicationSubmittedEmail(to, studentName, email, courseName)
      } catch (e) {
        console.error('[Notify] Admin notification failed for', to, e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send notification'
    console.error('[Notify] Error:', message, err)
    // Avoid exposing provider-specific or testing restrictions to applicants
    const safeMessage = /resend|testing emails|your own email|verify a domain|vonwillinghc/i.test(message)
      ? 'We couldn\'t send the confirmation email right now. Your application was saved. Check your spam folder or contact support for banking details.'
      : message
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}

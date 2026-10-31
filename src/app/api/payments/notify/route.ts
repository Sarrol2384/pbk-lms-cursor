import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendApplicationReceivedEmail, sendAdminApplicationSubmittedEmail } from '@/lib/email'

async function getAdminNotifyEmails(_supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const raw = process.env.ADMIN_NOTIFY_EMAIL?.trim() || 'info@pbkleadership.org.za'
  return Array.from(new Set(raw.split(',').map((part) => part.trim()).filter(Boolean)))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId, courseId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = !!caller && ['super_admin', 'admin'].includes(caller.role)
    if (user.id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createServiceClient()

    let email: string | null = null
    let firstName = 'Student'

    const { data: profile } = await service.from('profiles').select('first_name, last_name, email').eq('id', userId).single()
    if (profile) {
      firstName = profile.first_name || firstName
      email = profile.email || null
    }
    if (!email) {
      const { data: { user: authUser } } = await service.auth.admin.getUserById(userId)
      if (authUser?.email) {
        email = authUser.email
        await service.from('profiles').update({ email }).eq('id', userId)
      }
    }
    if (!email) return NextResponse.json({ error: 'Could not send the notification' }, { status: 400 })

    let courseName = 'your selected course'
    if (courseId) {
      const { data: course } = await service.from('courses').select('title').eq('id', courseId).single()
      if (course) courseName = course.title
    }

    await sendApplicationReceivedEmail(email, firstName, courseName, true, courseId ?? undefined)

    const adminEmails = await getAdminNotifyEmails(service)
    const studentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || firstName || 'Student'
    for (const to of adminEmails) {
      try {
        await sendAdminApplicationSubmittedEmail(to, studentName, email, courseName)
      } catch (e) {
        console.error('[Notify] Admin notification failed')
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    console.error('[Notify] Failed to send notification')
    return NextResponse.json({ error: 'Could not send the confirmation email right now. Your application was saved.' }, { status: 500 })
  }
}

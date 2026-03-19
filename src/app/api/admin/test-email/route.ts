import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendApplicationReceivedEmail } from '@/lib/email'

/**
 * POST /api/admin/test-email
 * Body: { "to": "someone@example.com" }
 * Admin/super_admin only. Sends a test "Application received" email to verify Brevo.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { to?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON. Send { "to": "email@example.com" }' }, { status: 400 })
  }

  const to = typeof body.to === 'string' ? body.to.trim() : ''
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Missing or invalid "to" email' }, { status: 400 })
  }

  try {
    await sendApplicationReceivedEmail(to, 'Test', 'Test Course')
    return NextResponse.json({ success: true, message: `Test email sent to ${to}. Check inbox and spam.` })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed'
    console.error('[Test email]', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

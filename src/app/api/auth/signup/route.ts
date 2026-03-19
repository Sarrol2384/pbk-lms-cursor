import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAccountCreatedEmail } from '@/lib/email'

/**
 * Server-side signup using Supabase Admin API.
 * Bypasses the "Email signups are disabled" restriction when the Email provider
 * is disabled in Supabase Dashboard but you still need to allow registrations.
 */
export async function POST(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 500 })
  }
  try {
    const body = await request.json()
    const { email, password, first_name, last_name, phone, id_number } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const service = createServiceClient()
    const { data, error } = await service.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        first_name: first_name?.trim() || '',
        last_name: last_name?.trim() || '',
        phone: phone?.trim() || '',
        id_number: id_number?.trim() || '',
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const firstName = first_name?.trim() || 'there'
    try {
      await sendAccountCreatedEmail(String(email).trim().toLowerCase(), firstName)
    } catch (emailErr) {
      console.error('[Signup] Welcome email failed:', emailErr)
      // Don't fail signup if email fails; user is already created
    }

    return NextResponse.json({ user: data.user })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Signup failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

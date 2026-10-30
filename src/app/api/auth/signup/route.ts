import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAccountCreatedEmail } from '@/lib/email'
import { clientIp, rateLimit } from '@/lib/rate-limit'

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
    const { email, password, first_name, last_name, phone, id_number, popia_consent } = body

    if (popia_consent !== true) {
      return NextResponse.json({ error: 'POPIA consent is required to create an account' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const limit = rateLimit(`signup:${clientIp(request)}`, 5, 15 * 60 * 1000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      )
    }

    const consentAt = new Date().toISOString()
    const service = createServiceClient()
    const { data, error } = await service.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      // email_confirm: true lets the account sign in without a confirmation link.
      // Trade-off: this works when Supabase's email provider is disabled, but it does
      // not prove the applicant controls the address. Set this to false and send a
      // confirmation email once the Email provider is enabled for the project.
      email_confirm: true,
      user_metadata: {
        first_name: first_name?.trim() || '',
        last_name: last_name?.trim() || '',
        phone: phone?.trim() || '',
        id_number: id_number?.trim() || '',
        popia_consent: true,
        popia_consent_at: consentAt,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user?.id) {
      const { error: consentErr } = await service.from('profiles').update({
        popia_consent: true,
        popia_consent_at: consentAt,
      }).eq('id', data.user.id)
      if (consentErr) {
        console.error('[Signup] Could not store POPIA consent on the profile. It is saved on the auth user.')
      }
    }

    const firstName = first_name?.trim() || 'there'
    try {
      await sendAccountCreatedEmail(String(email).trim().toLowerCase(), firstName)
    } catch {
      console.error('[Signup] Welcome email failed')
    }

    return NextResponse.json({ user: data.user })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Signup failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

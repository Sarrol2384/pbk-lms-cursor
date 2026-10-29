import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAccountCreatedEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

/** Signups allowed from one IP address inside the window below. */
const MAX_SIGNUPS_PER_IP = 5
const SIGNUP_WINDOW_MS = 60 * 60 * 1000

type PendingCookie = {
  name: string
  value: string
  options?: {
    domain?: string
    expires?: Date
    httpOnly?: boolean
    maxAge?: number
    path?: string
    sameSite?: boolean | 'lax' | 'strict' | 'none'
    secure?: boolean
  }
}

function getClientIp(request: NextRequest): string {
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return 'unknown'
}

function appOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return new URL(request.url).origin
}

function jsonWithCookies(body: unknown, cookiesToSet: PendingCookie[], status = 200) {
  const response = NextResponse.json(body, { status })
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options)
  }
  return response
}

/**
 * Creates an unconfirmed account with Supabase signUp and emails a confirmation link.
 * The SA ID number is written to profiles by the service role. It is never stored in user_metadata.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limit = rateLimit(`signup:${ip}`, MAX_SIGNUPS_PER_IP, SIGNUP_WINDOW_MS)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many signup attempts from this network. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const firstName = String(body.first_name ?? '').trim()
    const lastName = String(body.last_name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const idNumber = String(body.id_number ?? '').trim()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (password.length > 72) {
      return NextResponse.json({ error: 'Password must be at most 72 characters' }, { status: 400 })
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }
    if (!/^\d{13}$/.test(idNumber)) {
      return NextResponse.json({ error: 'Enter a 13-digit SA ID number' }, { status: 400 })
    }

    const turnstile = await verifyTurnstile(body.turnstileToken, ip === 'unknown' ? null : ip)
    if (!turnstile.ok) {
      return NextResponse.json({ error: turnstile.error }, { status: 400 })
    }

    const origin = appOrigin(request)
    const pendingCookies: PendingCookie[] = []
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((cookie) => pendingCookies.push(cookie))
          },
        },
      }
    )

    // Normal sign-up. Email confirmation follows the Supabase Auth setting.
    // Do not use the admin API with email_confirm: true.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const identities = data.user?.identities
    const created = !!data.user && (!identities || identities.length > 0)

    if (created && data.user) {
      const service = createServiceClient()
      const patch = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        id_number: idNumber,
      }
      const { data: updated, error: updateError } = await service
        .from('profiles')
        .update(patch)
        .eq('id', data.user.id)
        .select('id')
        .maybeSingle()

      if (updateError) {
        console.error('[Signup] Could not save profile:', updateError.message)
      } else if (!updated) {
        const { error: insertError } = await service.from('profiles').insert({
          id: data.user.id,
          ...patch,
          role: 'student',
        })
        if (insertError && insertError.code !== '23505') {
          console.error('[Signup] Could not create profile:', insertError.message)
        }
      }

      try {
        await sendAccountCreatedEmail(email, firstName)
      } catch (emailErr) {
        console.error('[Signup] Welcome email failed:', emailErr)
      }
    }

    const needsEmailVerification = !data.session
    return jsonWithCookies(
      { ok: true, needsEmailVerification },
      pendingCookies
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Signup failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return next
}

/**
 * Supabase redirects here after email confirmation (or password recovery) with ?code=...
 * Signup is started on the server, so the PKCE verifier is in a cookie and this route
 * can exchange the code. Password reset is started in the browser, so that code is
 * forwarded to /verify, which exchanges it where the verifier was stored.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (errorParam) {
    const msg = errorDesc ? `${errorDesc}` : 'Could not verify link. Please try again.'
    return NextResponse.redirect(`${origin}/verify?error=${encodeURIComponent(msg)}`)
  }

  if (code && next !== '/reset-password') {
    const redirectUrl = new URL(next || '/student/dashboard', origin)
    const response = NextResponse.redirect(redirectUrl)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  if (code) {
    const nextPart = next ? `&next=${encodeURIComponent(next)}` : ''
    return NextResponse.redirect(`${origin}/verify?code=${encodeURIComponent(code)}${nextPart}`)
  }

  return NextResponse.redirect(`${origin}/verify?error=${encodeURIComponent('Could not verify link. Please try again.')}`)
}

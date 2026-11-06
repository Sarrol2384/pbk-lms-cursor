import { NextRequest, NextResponse } from 'next/server'
import { recoveryCallbackLocation } from '@/lib/recovery-callback'

/**
 * Supabase redirects here after email confirmation (or OAuth) with ?code=...
 * PKCE requires the code exchange to run in the browser (code_verifier is in client storage),
 * so signup codes go to /verify?code=... and the client page exchanges them.
 * Password recovery keeps redirectTo on this callback. Only next=/reset-password
 * is forwarded there, including an implicit fragment the server cannot see.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  const recoveryTarget = recoveryCallbackLocation({
    origin,
    code,
    next,
    error: errorParam,
    errorDescription: errorDesc,
  })
  if (recoveryTarget) return NextResponse.redirect(recoveryTarget)

  if (errorParam) {
    const msg = errorDesc ? `${errorDesc}` : 'Could not verify link. Please try again.'
    return NextResponse.redirect(`${origin}/verify?error=${encodeURIComponent(msg)}`)
  }

  if (code) {
    const nextPart = next ? `&next=${encodeURIComponent(next)}` : ''
    return NextResponse.redirect(`${origin}/verify?code=${encodeURIComponent(code)}${nextPart}`)
  }

  return NextResponse.redirect(`${origin}/verify?error=${encodeURIComponent('Could not verify link. Please try again.')}`)
}

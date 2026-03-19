import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase redirects here after email confirmation (or OAuth) with ?code=...
 * PKCE requires the code exchange to run in the browser (code_verifier is in client storage),
 * so we redirect to /verify?code=... and let the client page do the exchange.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (errorParam) {
    const msg = errorDesc ? `${errorDesc}` : 'Could not verify link. Please try again.'
    return NextResponse.redirect(`${origin}/verify?error=${encodeURIComponent(msg)}`)
  }

  if (code) {
    // Pass the code to the client so it can run exchangeCodeForSession in the browser (PKCE)
    const nextPart = next ? `&next=${encodeURIComponent(next)}` : ''
    return NextResponse.redirect(`${origin}/verify?code=${encodeURIComponent(code)}${nextPart}`)
  }

  return NextResponse.redirect(`${origin}/verify?error=${encodeURIComponent('Could not verify link. Please try again.')}`)
}

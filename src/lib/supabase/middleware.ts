import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // If Supabase sends a password reset code to /login, forward to the callback
  const code = request.nextUrl.searchParams.get('code')
  if (pathname === '/login' && code) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/auth/callback'
    url.searchParams.set('code', code)
    url.searchParams.set('next', '/reset-password')
    return NextResponse.redirect(url)
  }

  const publicPaths = [
    '/login', '/register', '/verify', '/forgot-password',
    '/reset-password', '/api/auth/callback', '/api/auth/signup',
  ]
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/' || pathname === ''

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role
    let redirectPath = '/student/dashboard'
    if (role === 'super_admin' || role === 'admin') redirectPath = '/admin/dashboard'
    else if (role === 'lecturer') redirectPath = '/lecturer/dashboard'
    const url = request.nextUrl.clone()
    url.pathname = redirectPath
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

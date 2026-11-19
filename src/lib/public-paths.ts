/** Paths that signed-out visitors may open. Prefix match, plus the site root. */
export const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/register',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/api/auth/callback',
  '/api/auth/signup',
  '/about',
  '/education',
  '/team',
  '/apply',
  '/contact',
  '/events',
  '/research-support',
  '/api/public',
] as const

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

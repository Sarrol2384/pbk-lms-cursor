/**
 * Cloudflare Turnstile. The check runs only when TURNSTILE_SECRET_KEY is set.
 * Without that env var, signup behaves as before (no captcha).
 * The register form shows the widget only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Set both keys together.
 */
export async function verifyTurnstile(
  token: unknown,
  remoteIp: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return { ok: true }

  if (typeof token !== 'string' || token.length < 10 || token.length > 4096) {
    return { ok: false, error: 'Please complete the security check and try again.' }
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp) body.set('remoteip', remoteIp)

  let res: Response
  try {
    res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch {
    return { ok: false, error: 'Security check could not be completed. Please try again.' }
  }

  if (!res.ok) {
    return { ok: false, error: 'Security check could not be completed. Please try again.' }
  }

  const data = (await res.json().catch(() => null)) as { success?: boolean } | null
  if (!data?.success) {
    return { ok: false, error: 'Security check failed. Please try again.' }
  }
  return { ok: true }
}

import { NextResponse } from 'next/server'
import { INSTITUTE_EMAIL } from '@/lib/institute'
import { sendContactEnquiryEmails } from '@/lib/email'
import {
  PUBLIC_FORM_LIMIT,
  PUBLIC_FORM_WINDOW_MS,
  clientIp,
  rateLimit,
} from '@/lib/public-form-guard'
import { validateContact } from '@/lib/public-form-validation'
import { createAnonClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'We could not read that message.' }, { status: 400 })
  }

  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  if (typeof record.pbk_hp_field === 'string' && record.pbk_hp_field.trim()) {
    rateLimit(`contact:${clientIp(request)}`, PUBLIC_FORM_LIMIT, PUBLIC_FORM_WINDOW_MS)
    return NextResponse.json({ ok: true })
  }

  const parsed = validateContact(record)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 })
  }

  const limit = rateLimit(`contact:${clientIp(request)}`, PUBLIC_FORM_LIMIT, PUBLIC_FORM_WINDOW_MS)
  if (!limit.ok) {
    return NextResponse.json({
      ok: false,
      message: 'Please wait a few minutes before sending another message.',
    }, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfterSec) },
    })
  }

  const id = crypto.randomUUID()
  const value = parsed.value
  const anon = createAnonClient()
  const { error } = await anon.from('contact_enquiries').insert({
    id,
    name: value.name,
    email: value.email,
    phone: value.phone,
    subject: value.subject,
    message: value.message,
    popia_consent: true,
    popia_consent_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[Contact] Save failed', error.code)
    return NextResponse.json({
      ok: false,
      message: `We could not save your message just now. Please email ${INSTITUTE_EMAIL}.`,
    }, { status: 503 })
  }

  const mail = await sendContactEnquiryEmails({ id, ...value })
  return NextResponse.json({
    ok: true,
    reference: id.slice(0, 8).toUpperCase(),
    emailSent: mail.inboxSent && mail.applicantSent,
    warning: mail.inboxSent && mail.applicantSent
      ? null
      : `Your message was saved. If you do not hear from us, write to ${INSTITUTE_EMAIL} and quote your reference.`,
  })
}

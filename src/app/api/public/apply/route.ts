import { NextResponse } from 'next/server'
import { INSTITUTE_EMAIL } from '@/lib/institute'
import { sendProspectusApplicationEmails } from '@/lib/email'
import {
  PUBLIC_FORM_LIMIT,
  PUBLIC_FORM_WINDOW_MS,
  clientIp,
  honeypotTripped,
  rateLimit,
} from '@/lib/public-form-guard'
import { validateApplication } from '@/lib/public-form-validation'
import { createAnonClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024

const MIME_EXT: Record<string, 'pdf' | 'jpg' | 'png'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

function looksLike(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'application/pdf') {
    return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  }
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mime === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }
  return false
}

function optionalFile(form: FormData): File | null {
  const entry = form.get('document')
  if (!(entry instanceof File) || entry.size === 0) return null
  return entry
}

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, message: 'We could not read that submission.' }, { status: 400 })
  }

  if (honeypotTripped(form.get('pbk_hp_field'))) {
    rateLimit(`apply:${clientIp(request)}`, PUBLIC_FORM_LIMIT, PUBLIC_FORM_WINDOW_MS)
    return NextResponse.json({ ok: true })
  }

  const parsed = validateApplication({
    firstName: form.get('firstName'),
    lastName: form.get('lastName'),
    email: form.get('email'),
    phone: form.get('phone'),
    idNumber: form.get('idNumber'),
    city: form.get('city'),
    country: form.get('country'),
    programmeId: form.get('programmeId'),
    level: form.get('level'),
    studyMode: form.get('studyMode'),
    highestQualification: form.get('highestQualification'),
    highestQualificationOther: form.get('highestQualificationOther'),
    popiaConsent: form.get('popiaConsent'),
  })
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 })
  }

  const file = optionalFile(form)
  let fileBytes: Buffer | null = null
  let fileExt: 'pdf' | 'jpg' | 'png' | null = null
  let fileType = ''
  if (file) {
    fileExt = MIME_EXT[file.type] ?? null
    if (!fileExt || file.size > MAX_BYTES) {
      return NextResponse.json({
        ok: false,
        errors: { document: 'Upload a PDF, JPG or PNG no larger than 5 MB, or leave the document blank.' },
      }, { status: 400 })
    }
    fileBytes = Buffer.from(await file.arrayBuffer())
    if (!looksLike(fileBytes, file.type)) {
      return NextResponse.json({
        ok: false,
        errors: { document: 'That file does not look like a PDF, JPG or PNG.' },
      }, { status: 400 })
    }
    fileType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  }

  const limit = rateLimit(`apply:${clientIp(request)}`, PUBLIC_FORM_LIMIT, PUBLIC_FORM_WINDOW_MS)
  if (!limit.ok) {
    return NextResponse.json({
      ok: false,
      message: 'Please wait a few minutes before submitting another application.',
    }, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfterSec) },
    })
  }

  const id = crypto.randomUUID()
  const value = parsed.value
  const anon = createAnonClient()
  const { error: insertError } = await anon.from('prospectus_applications').insert({
    id,
    status: 'new',
    first_name: value.firstName,
    last_name: value.lastName,
    email: value.email,
    phone: value.phone,
    id_number: value.idNumber || null,
    city: value.city || null,
    country: value.country,
    programme_id: value.programmeId,
    programme_name: value.programmeName,
    school_name: value.schoolName,
    level: value.level,
    study_mode: value.studyMode,
    highest_qualification: value.qualificationLabel,
    document_path: null,
    popia_consent: true,
    popia_consent_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('[Apply] Save failed', insertError.code)
    return NextResponse.json({
      ok: false,
      message: `We could not save your application just now. Please email ${INSTITUTE_EMAIL} and we will help you.`,
    }, { status: 503 })
  }

  let documentSaved = false
  if (fileBytes && fileExt) {
    try {
      const path = `${id}/supporting.${fileExt}`
      const service = createServiceClient()
      const { error: uploadError } = await service.storage
        .from('prospectus-applications')
        .upload(path, fileBytes, { contentType: fileType, upsert: false })
      if (!uploadError) {
        const { error: updateError } = await service
          .from('prospectus_applications')
          .update({ document_path: path, updated_at: new Date().toISOString() })
          .eq('id', id)
        documentSaved = !updateError
      }
    } catch {
      documentSaved = false
    }
  }

  const mail = await sendProspectusApplicationEmails({
    id,
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email,
    phone: value.phone,
    idNumber: value.idNumber,
    city: value.city,
    country: value.country,
    schoolName: value.schoolName,
    programmeName: value.programmeName,
    levelLabel: value.levelLabel,
    studyModeLabel: value.studyModeLabel,
    qualificationLabel: value.qualificationLabel,
    hasDocument: documentSaved,
  })

  const warnings: string[] = []
  if (file && !documentSaved) {
    warnings.push('Your application was saved, but the document did not upload. You can email it to us and quote your reference.')
  }
  if (!mail.inboxSent || !mail.applicantSent) {
    warnings.push(`Your application was saved. If you do not receive an acknowledgement shortly, write to ${INSTITUTE_EMAIL} and quote your reference.`)
  }

  return NextResponse.json({
    ok: true,
    reference: id.slice(0, 8).toUpperCase(),
    emailSent: mail.inboxSent && mail.applicantSent,
    documentSaved: file ? documentSaved : true,
    warning: warnings[0] ?? null,
  })
}

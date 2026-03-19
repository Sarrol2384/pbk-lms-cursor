import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildCertificatePdf } from '@/lib/certificate-pdf'

/** GET: generate a sample certificate PDF so super_admin can check logo and signatures. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data: settingsRow } = await service.from('certificate_settings').select('*').limit(1).maybeSingle()
  const settings = settingsRow ? {
    institution_name: settingsRow.institution_name ?? 'PBK University',
    logo_url: settingsRow.logo_url ?? null,
    seal_url: settingsRow.seal_url ?? null,
    signature1_url: settingsRow.signature1_url ?? null,
    signature1_name: settingsRow.signature1_name ?? null,
    signature1_title: settingsRow.signature1_title ?? null,
    signature2_url: settingsRow.signature2_url ?? null,
    signature2_name: settingsRow.signature2_name ?? null,
    signature2_title: settingsRow.signature2_title ?? null,
  } : null

  const buf = await buildCertificatePdf(
    {
      fullName: 'Sample Learner',
      courseTitle: 'Sample Course Title',
      courseCode: 'SAMPLE-101',
      nqf: 5,
      credits: 12,
      certificateNumber: 'PREVIEW-000000',
      issuedDate: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    settings
  )

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="certificate-preview.pdf"',
      'Content-Length': String(buf.length),
    },
  })
}

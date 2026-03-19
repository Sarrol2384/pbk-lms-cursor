import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { buildCertificatePdf } from '@/lib/certificate-pdf'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: cert } = await service
    .from('certificates')
    .select('id, user_id, certificate_number, issued_at, profiles:user_id(first_name, last_name), courses:course_id(title, code, nqf_level, credits)')
    .eq('id', params.id)
    .single()
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  const profile = cert.profiles as { first_name?: string; last_name?: string } | null
  const course = cert.courses as { title?: string; code?: string; nqf_level?: number; credits?: number } | null
  const isOwner = cert.user_id === user.id
  const { data: authProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = ['admin', 'super_admin'].includes(authProfile?.role ?? '')
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Learner'
  const courseTitle = course?.title ?? 'Course'
  const courseCode = course?.code ?? ''
  const nqf = course?.nqf_level ?? ''
  const credits = course?.credits ?? ''
  const issued = formatDate(cert.issued_at)

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
      fullName,
      courseTitle,
      courseCode,
      nqf,
      credits,
      certificateNumber: cert.certificate_number as string,
      issuedDate: issued,
    },
    settings
  )

  const filename = `certificate-${(cert.certificate_number as string).replace(/\s+/g, '-')}.pdf`
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buf.length),
    },
  })
}

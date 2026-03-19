import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data: row } = await service.from('certificate_settings').select('*').limit(1).maybeSingle()
  return NextResponse.json(row ?? {
    institution_name: 'PBK Management and Leadership Institute',
    logo_url: null,
    seal_url: null,
    signature1_url: null,
    signature1_name: null,
    signature1_title: null,
    signature2_url: null,
    signature2_name: null,
    signature2_title: null,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const {
    institution_name,
    logo_url,
    seal_url,
    signature1_url,
    signature1_name,
    signature1_title,
    signature2_url,
    signature2_name,
    signature2_title,
  } = body

  const service = createServiceClient()
  const { data: existing } = await service.from('certificate_settings').select('id').limit(1).maybeSingle()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof institution_name === 'string') payload.institution_name = institution_name
  if (logo_url !== undefined) payload.logo_url = logo_url
  if (seal_url !== undefined) payload.seal_url = seal_url
  if (signature1_url !== undefined) payload.signature1_url = signature1_url
  if (signature1_name !== undefined) payload.signature1_name = signature1_name
  if (signature1_title !== undefined) payload.signature1_title = signature1_title
  if (signature2_url !== undefined) payload.signature2_url = signature2_url
  if (signature2_name !== undefined) payload.signature2_name = signature2_name
  if (signature2_title !== undefined) payload.signature2_title = signature2_title

  if (existing?.id) {
    const { error } = await service.from('certificate_settings').update(payload).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await service.from('certificate_settings').insert({
      ...payload,
      institution_name: (payload.institution_name as string) || 'PBK Management and Leadership Institute',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

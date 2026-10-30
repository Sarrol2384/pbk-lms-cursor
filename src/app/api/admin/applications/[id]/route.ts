import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUSES = ['new', 'contacted', 'accepted', 'declined'] as const

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const status = body && typeof body === 'object' ? (body as { status?: unknown }).status : null
  if (typeof status !== 'string' || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: 'Choose a valid status.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('prospectus_applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Could not update that application.' }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}

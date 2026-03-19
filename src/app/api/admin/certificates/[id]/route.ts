import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile.data?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { certificate_number, issued_at } = body
  if (typeof certificate_number !== 'string' || !certificate_number.trim()) {
    return NextResponse.json({ error: 'certificate_number required' }, { status: 400 })
  }

  const service = createServiceClient()
  const updates: { certificate_number: string; issued_at?: string } = { certificate_number: certificate_number.trim() }
  if (issued_at !== undefined) updates.issued_at = issued_at || null

  const { error } = await service.from('certificates').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

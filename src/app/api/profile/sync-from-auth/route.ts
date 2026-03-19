import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Syncs the current user's profile from auth.users raw_user_meta_data.
 * Call after email verification or first login to backfill phone/id_number.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = user.user_metadata ?? {}
  const first_name = meta.first_name ?? ''
  const last_name = meta.last_name ?? ''
  const phone = meta.phone ? String(meta.phone).trim() || null : null
  const id_number = meta.id_number ? String(meta.id_number).trim() || null : null

  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({
      first_name: first_name || undefined,
      last_name: last_name || undefined,
      phone: phone ?? undefined,
      id_number: id_number ?? undefined,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

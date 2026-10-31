import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** POST: Admin syncs orphan payments (proof uploaded but enrollment_id null) to enrollments. */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: orphanPayments } = await service
    .from('payments')
    .select('id, user_id, course_id, proof_url, status')
    .is('enrollment_id', null)
    .not('proof_url', 'is', null)

  let synced = 0
  for (const p of orphanPayments ?? []) {
    if (!p.user_id || !p.course_id) continue
    const { data: enrollment } = await service
      .from('enrollments')
      .select('id')
      .eq('user_id', p.user_id)
      .eq('course_id', p.course_id)
      .limit(1)
      .maybeSingle()
    if (enrollment?.id) {
      const { error } = await service.from('payments').update({ enrollment_id: enrollment.id }).eq('id', p.id)
      if (!error) synced++
    }
  }

  return NextResponse.json({ synced, total: orphanPayments?.length ?? 0 })
}

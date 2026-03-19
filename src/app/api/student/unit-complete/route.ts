import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { unitId } = await request.json()
  if (!unitId) return NextResponse.json({ error: 'unitId required' }, { status: 400 })

  const service = createServiceClient()
  const { data: unit } = await service.from('units').select('id, module_id').eq('id', unitId).single()
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  const { data: module } = await service.from('modules').select('course_id').eq('id', unit.module_id).single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', module.course_id).eq('status', 'approved').single()
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled or not approved' }, { status: 403 })

  await service.from('unit_completions').upsert(
    { user_id: user.id, unit_id: unitId },
    { onConflict: 'user_id,unit_id' }
  )

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { assertPreviousModulePassed, requireActiveEnrollment } from '@/lib/enrollment-access'
import { updateModuleProgress } from '@/lib/progress'

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

  const access = await requireActiveEnrollment(user.id, module.course_id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus })

  const unlocked = await assertPreviousModulePassed(user.id, module.course_id, unit.module_id)
  if (!unlocked.ok) return NextResponse.json({ error: unlocked.error }, { status: unlocked.error === 'Module not found' ? 404 : 403 })

  await service.from('unit_completions').upsert(
    { user_id: user.id, unit_id: unitId },
    { onConflict: 'user_id,unit_id' }
  )

  await updateModuleProgress(user.id, unit.module_id)

  return NextResponse.json({ success: true })
}

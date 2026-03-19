import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * GET ?courseId=... - returns { moduleProgress: { [moduleId]: 'in_progress' | 'passed' }, completedUnitIds: string[] }
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const courseId = request.nextUrl.searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const service = createServiceClient()
  const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', courseId).eq('status', 'approved').single()
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  const { data: modules } = await service.from('modules').select('id').eq('course_id', courseId).order('sequence', { ascending: true })
  const moduleIds = (modules ?? []).map(m => m.id)

  const { data: progressRows } = await service.from('module_progress').select('module_id, status').eq('user_id', user.id).in('module_id', moduleIds)
  const moduleProgress: Record<string, 'in_progress' | 'passed'> = {}
  for (const r of progressRows ?? []) {
    moduleProgress[r.module_id] = r.status as 'in_progress' | 'passed'
  }
  for (const id of moduleIds) {
    if (!moduleProgress[id]) moduleProgress[id] = 'in_progress'
  }

  const { data: units } = await service.from('units').select('id').in('module_id', moduleIds)
  const unitIds = (units ?? []).map(u => u.id)
  const { data: completions } = await service.from('unit_completions').select('unit_id').eq('user_id', user.id).in('unit_id', unitIds)
  const completedUnitIds = (completions ?? []).map(c => c.unit_id)

  return NextResponse.json({ moduleProgress, completedUnitIds })
}

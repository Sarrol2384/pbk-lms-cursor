import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * DELETE: Remove a module and its units, assessments, submissions, progress.
 * Admin only. Use to remove duplicate or unwanted modules.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const moduleId = params.moduleId
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: module } = await service.from('modules').select('id, course_id').eq('id', moduleId).single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { data: assessments } = await service.from('assessments').select('id').eq('module_id', moduleId)
  const assessmentIds = (assessments ?? []).map((a) => a.id)

  if (assessmentIds.length > 0) {
    await service.from('submissions').delete().in('assessment_id', assessmentIds)
    await service.from('quiz_questions').delete().in('assessment_id', assessmentIds)
    await service.from('assignment_rubrics').delete().in('assessment_id', assessmentIds)
  }
  await service.from('assessments').delete().eq('module_id', moduleId)

  const { data: units } = await service.from('units').select('id').eq('module_id', moduleId)
  const unitIds = (units ?? []).map((u) => u.id)
  if (unitIds.length > 0) {
    await service.from('unit_completions').delete().in('unit_id', unitIds)
  }
  await service.from('units').delete().eq('module_id', moduleId)
  await service.from('module_progress').delete().eq('module_id', moduleId)
  const { error } = await service.from('modules').delete().eq('id', moduleId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

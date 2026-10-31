import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { assertAllUnitsComplete, assertPreviousModulePassed, requireActiveEnrollment } from '@/lib/enrollment-access'
import { updateModuleProgress } from '@/lib/progress'
import { ownSubmissionPath } from '@/lib/storage/signed-url'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assessmentId, fileUrl } = await request.json()
  if (!assessmentId || !fileUrl) return NextResponse.json({ error: 'assessmentId and fileUrl required' }, { status: 400 })

  const filePath = ownSubmissionPath(user.id, fileUrl)
  if (!filePath) return NextResponse.json({ error: 'Submission file must be one you uploaded' }, { status: 400 })

  const service = createServiceClient()
  const { data: assessment } = await service.from('assessments').select('id, module_id').eq('id', assessmentId).single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const { data: module } = await service.from('modules').select('course_id').eq('id', assessment.module_id).single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const access = await requireActiveEnrollment(user.id, module.course_id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus })

  const unlocked = await assertPreviousModulePassed(user.id, module.course_id, assessment.module_id)
  if (!unlocked.ok) return NextResponse.json({ error: unlocked.error }, { status: unlocked.error === 'Module not found' ? 404 : 403 })

  const unitsDone = await assertAllUnitsComplete(user.id, assessment.module_id)
  if (!unitsDone.ok) return NextResponse.json({ error: unitsDone.error }, { status: 403 })

  const moduleStatus = await updateModuleProgress(user.id, assessment.module_id)
  if (moduleStatus === 'passed') {
    return NextResponse.json({ error: 'This module is already passed' }, { status: 400 })
  }

  const { error: fileErr } = await service.storage.from('submissions').download(filePath)
  if (fileErr) return NextResponse.json({ error: 'Submission file not found. Upload it again.' }, { status: 400 })

  const { data: existing } = await service.from('submissions').select('id').eq('user_id', user.id).eq('assessment_id', assessmentId).maybeSingle()
  if (existing) {
    const { error } = await service.from('submissions').update({
      file_url: filePath,
      status: 'submitted',
      marks_obtained: null,
      feedback: null,
      submitted_at: new Date().toISOString(),
    }).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, submissionId: existing.id })
  }

  const { data: row, error } = await service.from('submissions').insert({
    user_id: user.id,
    assessment_id: assessmentId,
    file_url: filePath,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, submissionId: row.id })
}

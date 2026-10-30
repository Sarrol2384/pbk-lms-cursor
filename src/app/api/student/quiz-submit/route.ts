import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshProgressAndCertificate, updateModuleProgress } from '@/lib/progress'
import { assertAllUnitsComplete, assertPreviousModulePassed, requireActiveEnrollment } from '@/lib/enrollment-access'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assessmentId, answers } = await request.json()
  if (!assessmentId || typeof answers !== 'object') return NextResponse.json({ error: 'assessmentId and answers required' }, { status: 400 })

  const service = createServiceClient()
  const { data: assessment } = await service.from('assessments').select('id, module_id, total_marks').eq('id', assessmentId).single()
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

  const { data: questions } = await service.from('quiz_questions').select('id, correct_answer, marks').eq('assessment_id', assessmentId)
  if (!questions?.length) return NextResponse.json({ error: 'No questions' }, { status: 400 })

  let marksObtained = 0
  for (const q of questions) {
    const studentAnswer = answers[q.id]
    if (String(studentAnswer).toUpperCase() === String(q.correct_answer).toUpperCase()) {
      marksObtained += q.marks ?? 0
    }
  }
  const totalMarks = assessment.total_marks ?? questions.reduce((s, q) => s + (q.marks ?? 0), 0)

  const { data: existing } = await service.from('submissions').select('id').eq('user_id', user.id).eq('assessment_id', assessmentId).maybeSingle()
  if (existing) {
    await service.from('submissions').update({
      answers: answers as Record<string, unknown>,
      marks_obtained: marksObtained,
      status: 'graded',
      submitted_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await service.from('submissions').insert({
      user_id: user.id,
      assessment_id: assessmentId,
      answers: answers as Record<string, unknown>,
      marks_obtained: marksObtained,
      status: 'graded',
      submitted_at: new Date().toISOString(),
    })
  }

  await refreshProgressAndCertificate(user.id, module.course_id)
  return NextResponse.json({ marks_obtained: marksObtained, total_marks: totalMarks })
}

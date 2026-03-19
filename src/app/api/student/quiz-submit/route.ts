import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshProgressAndCertificate } from '@/lib/progress'

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

  const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', module.course_id).eq('status', 'approved').single()
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

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

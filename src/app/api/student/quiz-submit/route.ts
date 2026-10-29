import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshProgressAndCertificate } from '@/lib/progress'
import { MAX_QUIZ_ATTEMPTS, QUIZ_GRADE_POLICY } from '@/lib/quiz'

/**
 * Grades one quiz attempt and stores it. The mark on submissions (the one
 * module progress and the quiz page treat as the grade) is the best attempt.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const assessmentId = body?.assessmentId
  const answers = body?.answers
  if (!assessmentId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'assessmentId and answers required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: assessment } = await service.from('assessments').select('id, module_id, total_marks, type').eq('id', assessmentId).single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  if (!['formative_quiz', 'module_test', 'final_exam'].includes(assessment.type)) {
    return NextResponse.json({ error: 'This assessment is not a quiz' }, { status: 400 })
  }

  const { data: module } = await service.from('modules').select('course_id').eq('id', assessment.module_id).single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', module.course_id).eq('status', 'approved').single()
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  const { count, error: countError } = await service
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('assessment_id', assessmentId)
  if (countError) {
    return NextResponse.json({ error: 'Quiz attempts could not be checked. Apply the latest database migration and try again.' }, { status: 500 })
  }

  const used = count ?? 0
  if (used >= MAX_QUIZ_ATTEMPTS) {
    return NextResponse.json(
      { error: `You have used all ${MAX_QUIZ_ATTEMPTS} attempts for this quiz.` },
      { status: 403 }
    )
  }

  const { data: questions } = await service.from('quiz_questions').select('id, correct_answer, marks').eq('assessment_id', assessmentId)
  if (!questions?.length) return NextResponse.json({ error: 'No questions' }, { status: 400 })

  let marksObtained = 0
  for (const q of questions) {
    const studentAnswer = (answers as Record<string, unknown>)[q.id]
    if (String(studentAnswer).toUpperCase() === String(q.correct_answer).toUpperCase()) {
      marksObtained += q.marks ?? 0
    }
  }
  const totalMarks = assessment.total_marks ?? questions.reduce((s, q) => s + (q.marks ?? 0), 0)
  const attemptNumber = used + 1
  const submittedAt = new Date().toISOString()

  const { error: insertError } = await service.from('quiz_attempts').insert({
    user_id: user.id,
    assessment_id: assessmentId,
    attempt_number: attemptNumber,
    answers,
    marks_obtained: marksObtained,
    total_marks: totalMarks,
    submitted_at: submittedAt,
  })
  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'That attempt was already recorded. Refresh the page and try again if you have attempts left.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: allAttempts } = await service
    .from('quiz_attempts')
    .select('marks_obtained, answers, submitted_at')
    .eq('user_id', user.id)
    .eq('assessment_id', assessmentId)

  let bestMarks = marksObtained
  let bestAnswers: Record<string, unknown> = answers
  let bestAt = submittedAt
  for (const attempt of allAttempts ?? []) {
    const score = attempt.marks_obtained ?? 0
    if (score > bestMarks) {
      bestMarks = score
      bestAnswers = (attempt.answers ?? {}) as Record<string, unknown>
      bestAt = attempt.submitted_at ?? bestAt
    }
  }

  const { data: existing } = await service
    .from('submissions')
    .select('id, marks_obtained')
    .eq('user_id', user.id)
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  // A mark already on the submission (for example from a lecturer) stays if it is higher.
  const recordedBest = existing?.marks_obtained != null && existing.marks_obtained > bestMarks
    ? existing.marks_obtained
    : bestMarks

  if (recordedBest === bestMarks) {
    const submissionPatch = {
      answers: bestAnswers,
      marks_obtained: bestMarks,
      status: 'graded' as const,
      submitted_at: bestAt,
    }
    if (existing) {
      const { error: updateError } = await service.from('submissions').update(submissionPatch).eq('id', existing.id)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    } else {
      const { error: submissionError } = await service.from('submissions').insert({
        user_id: user.id,
        assessment_id: assessmentId,
        ...submissionPatch,
      })
      if (submissionError) return NextResponse.json({ error: submissionError.message }, { status: 500 })
    }
  }

  await refreshProgressAndCertificate(user.id, module.course_id)

  return NextResponse.json({
    marks_obtained: marksObtained,
    best_marks: recordedBest,
    total_marks: totalMarks,
    attempt_number: attemptNumber,
    attempts_allowed: MAX_QUIZ_ATTEMPTS,
    attempts_remaining: Math.max(0, MAX_QUIZ_ATTEMPTS - attemptNumber),
    grade_policy: QUIZ_GRADE_POLICY,
  })
}

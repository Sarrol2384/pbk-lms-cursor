import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const QUIZ_QUESTIONS = 10
const QUIZ_MARKS_EACH = 10
const PASS_MARK = 70

/**
 * POST { moduleId: string }
 * Regenerates only the quiz and assignment for an existing module.
 * Replaces any existing assessments for that module. Does not touch units or module metadata.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { moduleId } = body
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: module } = await service
    .from('modules')
    .select('id, title, description, sequence, course_id, pass_mark')
    .eq('id', moduleId)
    .single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { data: course } = await service
    .from('courses')
    .select('title, nqf_level, credits, description')
    .eq('id', module.course_id)
    .single()
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const { data: units } = await service
    .from('units')
    .select('id, title, sequence, content')
    .eq('module_id', moduleId)
    .order('sequence', { ascending: true })

  const unitSummaries = (units ?? []).map((u) => `Unit ${u.sequence}: ${u.title}${u.content ? ` — ${String(u.content).slice(0, 200)}...` : ''}`).join('\n')

  const prompt = `You are a SETA-accredited curriculum designer in South Africa creating assessment content only.

COURSE: ${course.title}
NQF Level: ${course.nqf_level ?? 'Not specified'} | Credits: ${course.credits ?? 'Not specified'}

MODULE TO ASSESS: "${module.title}"
${module.description ? `Description: ${module.description}` : ''}

UNIT CONTENT (use this to align quiz and assignment):
${unitSummaries || 'No unit content provided.'}

TASK: Generate ONLY the quiz and assignment for this module. No units, no module metadata.

1. QUIZ (REQUIRED): One formative quiz. You MUST include the full "questions" array—do not omit or truncate.
   - title: e.g. "Module ${module.sequence} Formative Quiz" or "${module.title} – Formative Quiz"
   - total_marks: 100, weight: 10
   - questions: Exactly ${QUIZ_QUESTIONS} MCQ questions. Each: question, option_a, option_b, option_c, option_d (strings), correct_answer ("A"|"B"|"C"|"D"), marks: ${QUIZ_MARKS_EACH}. Total = 100.

2. ASSIGNMENT (REQUIRED): One assignment. You MUST include "brief" and "rubric" with exactly 5 criteria.
   - title: e.g. "Module ${module.sequence} Assignment" or "${module.title} – Assignment"
   - total_marks: 100, weight: 20
   - brief: 200-300 words: clear instructions, submission requirements, word count, referencing. South African context.
   - rubric: exactly 5 objects. Each: { "criteria": "Clear criterion description", "marks": 20 }. Total = 100.

Output MUST be valid JSON only (no markdown, no code fence). Escape double-quotes in strings with \\. No trailing commas. Use this exact structure:

{
  "quiz": {
    "title": "...",
    "total_marks": 100,
    "weight": 10,
    "questions": [
      { "question": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "A", "marks": ${QUIZ_MARKS_EACH} }
    ]
  },
  "assignment": {
    "title": "...",
    "total_marks": 100,
    "weight": 20,
    "brief": "...",
    "rubric": [
      { "criteria": "...", "marks": 20 }
    ]
  }
}`

  const MAX_ATTEMPTS = 3
  let lastError = ''

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text.trim()
      let jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

      let generated: { quiz?: Record<string, unknown>; assignment?: Record<string, unknown> }
      try {
        generated = JSON.parse(jsonStr)
      } catch (parseErr) {
        lastError = parseErr instanceof Error ? parseErr.message : 'Invalid JSON'
        continue
      }

      const questions = Array.isArray(generated.quiz?.questions) ? generated.quiz.questions : []
      const rubric = Array.isArray(generated.assignment?.rubric) ? generated.assignment.rubric : []
      if (questions.length === 0 || rubric.length === 0) {
        lastError = `Missing quiz questions (${questions.length}) or assignment rubric (${rubric.length}).`
        continue
      }

      // Remove existing assessments for this module (and related rows)
      const { data: existingAssessments } = await service.from('assessments').select('id').eq('module_id', moduleId)
      const assessmentIds = (existingAssessments ?? []).map((a) => a.id)
      if (assessmentIds.length > 0) {
        await service.from('submissions').delete().in('assessment_id', assessmentIds)
        await service.from('quiz_questions').delete().in('assessment_id', assessmentIds)
        await service.from('assignment_rubrics').delete().in('assessment_id', assessmentIds)
        await service.from('assessments').delete().eq('module_id', moduleId)
      }

      // Insert new quiz
      const quizTitle = (generated.quiz?.title as string) || `Module ${module.sequence} Formative Quiz`
      const { data: quizAssessment, error: quizErr } = await service
        .from('assessments')
        .insert({
          module_id: moduleId,
          title: quizTitle,
          type: 'formative_quiz',
          total_marks: (generated.quiz?.total_marks as number) ?? 100,
          weight: (generated.quiz?.weight as number) ?? 10,
        })
        .select('id')
        .single()

      if (quizErr || !quizAssessment) {
        return NextResponse.json({ error: quizErr?.message || 'Failed to create quiz assessment' }, { status: 500 })
      }

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi] as Record<string, unknown>
        await service.from('quiz_questions').insert({
          assessment_id: quizAssessment.id,
          sequence: qi + 1,
          question: (q.question ?? '') as string,
          option_a: (q.option_a ?? '') as string,
          option_b: (q.option_b ?? '') as string,
          option_c: (q.option_c ?? '') as string,
          option_d: (q.option_d ?? '') as string,
          correct_answer: ['A', 'B', 'C', 'D'].includes((q.correct_answer as string) ?? '') ? (q.correct_answer as string) : 'A',
          marks: (q.marks ?? QUIZ_MARKS_EACH) as number,
        })
      }

      // Insert new assignment
      const assignTitle = (generated.assignment?.title as string) || `Module ${module.sequence} Assignment`
      const { data: assignAssessment, error: assignErr } = await service
        .from('assessments')
        .insert({
          module_id: moduleId,
          title: assignTitle,
          type: 'assignment',
          total_marks: (generated.assignment?.total_marks as number) ?? 100,
          weight: (generated.assignment?.weight as number) ?? 20,
          brief: (generated.assignment?.brief as string) || null,
        })
        .select('id')
        .single()

      if (assignErr || !assignAssessment) {
        return NextResponse.json({ error: assignErr?.message || 'Failed to create assignment' }, { status: 500 })
      }

      for (const r of rubric) {
        const row = r as { criteria?: string; marks?: number }
        if (row.criteria) {
          await service.from('assignment_rubrics').insert({
            assessment_id: assignAssessment.id,
            criteria: row.criteria,
            marks: row.marks ?? 20,
          })
        }
      }

      return NextResponse.json({
        success: true,
        quizQuestions: questions.length,
        rubricCriteria: rubric.length,
      })
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      if (attempt === MAX_ATTEMPTS) {
        return NextResponse.json({ error: lastError }, { status: 500 })
      }
    }
  }

  return NextResponse.json(
    { error: `Generation failed after ${MAX_ATTEMPTS} attempts.`, details: lastError },
    { status: 500 }
  )
}

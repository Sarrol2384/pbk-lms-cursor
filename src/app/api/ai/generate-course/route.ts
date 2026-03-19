import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DEFAULT_BATCH_SIZE = 2

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const {
    courseTitle,
    nqfLevel,
    credits,
    description,
    batchIndex = 0,
    existingModuleCount = 0,
    existingModuleTitles = [],
    unitsPerModule: requestedUnitsPerModule = 5,
    quizQuestionsPerModule = 20,
    passMark = 70,
    generateFullContent = true,
    moduleNames = [],
    moduleCredits: requestedModuleCredits,
    moduleYear,
    batchSize: requestedBatchSize,
  } = body

  if (!courseTitle) return NextResponse.json({ error: 'Course title is required' }, { status: 400 })

  const BATCH_SIZE = requestedBatchSize === 1 ? 1 : DEFAULT_BATCH_SIZE
  const namesList = Array.isArray(moduleNames) ? moduleNames : (moduleNames ? String(moduleNames).split('\n').map((s: string) => s.trim()).filter(Boolean) : [])
  const existingTitles = Array.isArray(existingModuleTitles) ? existingModuleTitles : []
  const useExactNames = namesList.length >= BATCH_SIZE
  const startSequence = existingModuleCount > 0 ? existingModuleCount + 1 : batchIndex * BATCH_SIZE + 1
  const sequenceList = Array.from({ length: BATCH_SIZE }, (_, i) => startSequence + i).join(' and ')
  const unitsPerModule = Math.max(1, Math.min(10, Number(requestedUnitsPerModule) || 5))
  // With full content, cap quiz questions at 10 so the JSON fits in one response (avoids truncation → empty quizzes)
  const quizN = typeof quizQuestionsPerModule === 'number' ? quizQuestionsPerModule : 20
  const effectiveQuizN = generateFullContent ? Math.min(quizN, 10) : quizN
  const quizMarksEach = effectiveQuizN > 0 ? Math.floor(100 / effectiveQuizN) : 5

  let effectiveModuleNames = namesList.slice(0, BATCH_SIZE)

  if (!useExactNames && existingTitles.length > 0 && BATCH_SIZE === 1) {
    try {
      const suggestRes = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Course: "${courseTitle}". Existing module titles (do not duplicate or overlap): ${existingTitles.join(' | ')}.\n\nSuggest ONE new module title that is clearly distinct and fits this course. Reply with only the title, no quotes, no explanation.`,
        }],
      })
      const raw = (suggestRes.content[0] as { type: string; text: string }).text.trim()
      const suggestedTitle = raw.replace(/^["']|["']$/g, '').trim()
      if (suggestedTitle) effectiveModuleNames = [suggestedTitle]
    } catch (_) {
      // continue without suggested title; prompt will still say "do not duplicate"
    }
  }

  const noDuplicateInstruction = existingTitles.length > 0
    ? `\nEXISTING MODULES IN THIS COURSE (your new module(s) must be on clearly DIFFERENT topics—do not duplicate or closely overlap): ${existingTitles.join(' | ')}`
    : ''
  const useSuggested = effectiveModuleNames.length >= BATCH_SIZE
  const creditsInstruction = requestedModuleCredits != null ? ` Use ${requestedModuleCredits} credits for this module.` : ''
  const yearInstruction = moduleYear ? ` This module is for ${String(moduleYear)} (e.g. Year 1 = NQF 5, Year 2 = NQF 6, Year 3 = NQF 7).` : ''

  const prompt = `You are a SETA-accredited curriculum designer in South Africa creating COMPLETE, publication-ready course content.

COURSE CONTEXT:
- Title: ${courseTitle}
- NQF Level: ${nqfLevel ?? 'Not specified'}
- Total Credits: ${credits ?? 'Not specified'}
- Description: ${description || 'Not provided'}
${noDuplicateInstruction}
${yearInstruction}${creditsInstruction}

TASK: Generate exactly ${BATCH_SIZE} modules for this batch. Use academic style, South African context, and SETA standards. Match the same structure as the rest of the course: ${unitsPerModule} units per module, same content length and assessment style.

${useSuggested ? `USE THESE EXACT MODULE TITLES IN ORDER: ${effectiveModuleNames.slice(0, BATCH_SIZE).join(' | ')}` : ''}

For EACH of the ${BATCH_SIZE} modules, generate:

1. MODULE: title, description (2-3 sentences), credits (split total credits across all course modules appropriately), sequence (${sequenceList}), pass_mark: ${passMark}

2. UNITS: Exactly ${unitsPerModule} units per module. Each unit must have:
   - title
   - sequence (1 to ${unitsPerModule})
   - content: ${generateFullContent ? '1000-1400 words of learning material (academic style, South African context). Include clear headings, key concepts, and examples.' : '2-3 sentence summary of the unit topic.'}
   - key_concepts: array of 4-6 key terms/concepts
   - summary: one paragraph (3-5 sentences) summarising the unit
   - resources: array of 2-4 suggested BOOKS (prefer books over web links; they are stable and credible). Each resource must have:
     - title (book title)
     - type: "book"
     - author: author or editor (optional but recommended)
     - publisher: publisher name (optional)
     - year: publication year (optional)
     - reason: 1 sentence why this book helps the unit
     - url: only if you have a real, stable link (e.g. official publisher or SA catalogue); otherwise omit
     Do NOT invent or guess URLs. Prefer well-known South African or international textbooks.

3. QUIZ (REQUIRED): One formative_quiz per module. You MUST include the full "questions" array—do not omit or truncate it.
   - title: e.g. "Module N Formative Quiz"
   - total_marks: 100
   - weight: 10
   - questions: An array of exactly ${effectiveQuizN} MCQ questions. Each object: question (string), option_a, option_b, option_c, option_d (strings), correct_answer ("A"|"B"|"C"|"D"), marks: ${quizMarksEach}. Total marks = 100.

4. ASSIGNMENT (REQUIRED): One assignment per module. You MUST include "brief" and "rubric" with exactly 5 criteria.
   - title: e.g. "Module N Assignment"
   - total_marks: 100
   - weight: 20
   - brief: ${generateFullContent ? '200-300 words: clear instructions, submission requirements, word count, referencing. South African context.' : '2-3 sentences describing the task.'}
   - rubric: array of exactly 5 objects. Each: { "criteria": "Clear criterion description", "marks": 20 }. Total rubric marks = 100.

CRITICAL: Output MUST be valid JSON only (no markdown, no code fence, no text before or after). Escape any double-quotes inside strings with backslash (e.g. \\"). Do NOT use trailing commas. Use this exact structure:

{
  "modules": [
    {
      "title": "...",
      "description": "...",
      "credits": 30,
      "sequence": 1,
      "pass_mark": ${passMark},
      "units": [
        {
          "title": "...",
          "content": "...",
          "key_concepts": ["...", "..."],
          "summary": "...",
          "resources": [
            { "title": "...", "type": "book", "author": "...", "publisher": "...", "year": "2020", "reason": "...", "url": "optional" }
          ],
          "sequence": 1
        }
      ],
      "quiz": {
        "title": "...",
        "total_marks": 100,
        "weight": 10,
        "questions": [
          {
            "question": "...",
            "option_a": "...",
            "option_b": "...",
            "option_c": "...",
            "option_d": "...",
            "correct_answer": "A",
            "marks": 5
          }
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
    }
  ]
}`

  const MAX_ATTEMPTS = 3
  let lastError = ''

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text.trim()
      let jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

      let generated: { modules?: unknown[] }
      try {
        generated = JSON.parse(jsonStr)
      } catch (parseErr) {
        lastError = parseErr instanceof Error ? parseErr.message : 'Invalid JSON'
        console.error(`JSON parse error (attempt ${attempt}/${MAX_ATTEMPTS}):`, lastError)
        // Try again automatically
        continue
      }

      if (!generated?.modules || !Array.isArray(generated.modules)) {
        lastError = 'No modules array in response'
        console.error(`No modules (attempt ${attempt}/${MAX_ATTEMPTS})`)
        continue
      }

      // Validate each module has quiz questions and assignment rubric (retry if missing so we don't save empty quizzes)
      const invalid = (generated.modules as Record<string, unknown>[]).find((m, i) => {
        const q = (m?.quiz as Record<string, unknown> | undefined)
        const a = (m?.assignment as Record<string, unknown> | undefined)
        const questions = Array.isArray(q?.questions) ? q.questions : []
        const rubric = Array.isArray(a?.rubric) ? a.rubric : []
        if (questions.length === 0 || rubric.length === 0) {
          lastError = `Module ${i + 1} missing quiz questions (${questions.length}) or rubric (${rubric.length}). Retrying.`
          return true
        }
        return false
      })
      if (invalid) {
        console.warn(lastError)
        continue
      }

      return NextResponse.json(generated)
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      console.error(`AI generation error (attempt ${attempt}/${MAX_ATTEMPTS}):`, lastError)
      // Don't retry hard API errors (auth, rate limit etc.) — only parse failures above
      return NextResponse.json({ error: lastError }, { status: 500 })
    }
  }

  // All attempts exhausted
  return NextResponse.json(
    {
      error: `Generation failed after ${MAX_ATTEMPTS} attempts. Try fewer quiz questions per module, or try again in a moment.`,
      details: lastError,
    },
    { status: 500 }
  )
}

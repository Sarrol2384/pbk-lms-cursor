import { NextRequest, NextResponse } from 'next/server'
import Anthropic, { APIError, APIUserAbortError } from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { assertPreviousModulePassed, requireActiveEnrollment } from '@/lib/enrollment-access'
import { rateLimit } from '@/lib/rate-limit'
import {
  TUTOR_HOURLY_LIMIT,
  TUTOR_MODEL,
  TUTOR_WINDOW_MS,
  asksForDraftFeedback,
  buildTutorSystemPrompt,
  formatAssignmentContext,
  parseTutorRequest,
  readingTitles,
  type AssignmentContext,
} from '@/lib/tutor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UNAVAILABLE = "The tutor isn't available right now"

/**
 * Answers one tutor turn. The transcript is not written to the database.
 * The browser keeps the chat until the student leaves the page.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Type a question first.' }, { status: 400 })
  }

  const parsed = parseTutorRequest(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const service = createServiceClient()
  const [access, moduleRes] = await Promise.all([
    requireActiveEnrollment(user.id, parsed.value.courseId),
    service.from('modules').select('id, title, course_id').eq('id', parsed.value.moduleId).maybeSingle(),
  ])
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus })

  const moduleRow = moduleRes.data
  if (moduleRes.error) {
    console.error('tutor module lookup failed')
    return NextResponse.json({ error: 'The tutor could not reply. Please try again.' }, { status: 500 })
  }
  if (!moduleRow || moduleRow.course_id !== parsed.value.courseId) {
    return NextResponse.json({ error: 'This unit could not be found.' }, { status: 404 })
  }

  const [unlocked, unitRes, courseRes, assignmentRes] = await Promise.all([
    assertPreviousModulePassed(user.id, parsed.value.courseId, parsed.value.moduleId),
    service
      .from('units')
      .select('id, title, content, video_url, resources')
      .eq('id', parsed.value.unitId)
      .eq('module_id', parsed.value.moduleId)
      .maybeSingle(),
    service.from('courses').select('title').eq('id', parsed.value.courseId).maybeSingle(),
    service
      .from('assessments')
      .select('id, title, brief')
      .eq('module_id', parsed.value.moduleId)
      .eq('type', 'assignment'),
  ])

  if (!unlocked.ok) {
    const missing = unlocked.error === 'Module not found'
    return NextResponse.json(
      { error: missing ? 'This unit could not be found.' : unlocked.error },
      { status: missing ? 404 : 403 }
    )
  }
  const includeRubric = asksForDraftFeedback(parsed.value.messages)
  if (unitRes.error || courseRes.error || (includeRubric && assignmentRes.error)) {
    console.error('tutor content lookup failed')
    return NextResponse.json({ error: 'The tutor could not reply. Please try again.' }, { status: 500 })
  }
  const unit = unitRes.data
  if (!unit) return NextResponse.json({ error: 'This unit could not be found.' }, { status: 404 })

  const assignmentRows = assignmentRes.data ?? []
  let rubricRows: { id: string; assessment_id: string; criteria: string; marks: number | null }[] = []
  if (includeRubric && assignmentRows.length > 0) {
    const rubricRes = await service
      .from('assignment_rubrics')
      .select('id, assessment_id, criteria, marks')
      .in('assessment_id', assignmentRows.map((row) => row.id))
    if (rubricRes.error) {
      console.error('tutor rubric lookup failed')
      return NextResponse.json({ error: 'The tutor could not reply. Please try again.' }, { status: 500 })
    }
    rubricRows = rubricRes.data ?? []
    rubricRows.sort((a, b) => a.id.localeCompare(b.id))
  }

  const limit = rateLimit(`tutor:${user.id}`, TUTOR_HOURLY_LIMIT, TUTOR_WINDOW_MS)
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSec / 60))
    const minuteLabel = minutes === 1 ? 'minute' : 'minutes'
    return NextResponse.json(
      { error: `You have reached ${TUTOR_HOURLY_LIMIT} messages this hour. Please try again in ${minutes} ${minuteLabel}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  const assignments: AssignmentContext[] = includeRubric
    ? assignmentRows.map((row) => ({
      title: row.title ?? 'Assignment',
      brief: row.brief,
      criteria: rubricRows
        .filter((rubric) => rubric.assessment_id === row.id)
        .map((rubric) => ({ criteria: rubric.criteria, marks: rubric.marks ?? 0 })),
    }))
    : []

  const system = buildTutorSystemPrompt({
    courseTitle: courseRes.data?.title ?? '',
    moduleTitle: moduleRow.title ?? '',
    unitTitle: unit.title ?? '',
    unitText: typeof unit.content === 'string' ? unit.content : '',
    hasVideo: Boolean(unit.video_url),
    readings: readingTitles(unit.resources),
    rubricText: includeRubric
      ? formatAssignmentContext(assignments)
      : 'Not included for this question. Use it only when the learner asks for feedback on a draft. Do not invent criteria, and do not write the assignment.',
  })

  const client = new Anthropic({ apiKey })
  let anthropicStream
  try {
    anthropicStream = await client.messages.create({
      model: TUTOR_MODEL,
      max_tokens: 1200,
      temperature: 0.4,
      stream: true,
      system,
      messages: parsed.value.messages.map((turn) => ({ role: turn.role, content: turn.content })),
    }, { signal: request.signal })
  } catch (err) {
    if (request.signal.aborted || err instanceof APIUserAbortError) {
      return new Response(null, { status: 499 })
    }
    return providerFailure(err)
  }

  const encoder = new TextEncoder()
  let started = false
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta' && event.delta.text) {
            started = true
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        if (request.signal.aborted || err instanceof APIUserAbortError) {
          try { controller.close() } catch { /* already closed */ }
          return
        }
        console.error('tutor stream failed')
        if (!started) {
          controller.error(err)
          return
        }
        try {
          controller.enqueue(encoder.encode('\n\nI could not finish that reply. Please try again.'))
          controller.close()
        } catch { /* already closed */ }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

function providerFailure(err: unknown): NextResponse {
  if (err instanceof APIError) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }
    if (err.status === 429) {
      return NextResponse.json(
        { error: 'The tutor is busy right now. Please try again in a few minutes.' },
        { status: 503 }
      )
    }
    console.error('tutor provider error', err.status)
  } else {
    console.error('tutor provider error')
  }
  return NextResponse.json({ error: 'The tutor could not reply. Please try again.' }, { status: 502 })
}

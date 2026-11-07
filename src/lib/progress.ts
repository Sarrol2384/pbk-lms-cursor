import { createServiceClient } from '@/lib/supabase/server'
import { calculateModuleMark, generateCertificateNumber } from '@/lib/utils'
import { sendCertificateIssuedEmail } from '@/lib/email'
import { tuitionForUserCourse } from '@/lib/tuition-lookup'
import { completionIssueDecision } from '@/lib/tuition'
import {
  persistCompletionCertificate,
  type CertificateRefreshResult,
} from '@/lib/certificate-issue'

export type ProgressCertificateResult = CertificateRefreshResult | {
  ok: true
  created: false
  certificateId: null
  reason: 'no_modules' | 'incomplete' | 'tuition_incomplete'
}

/**
 * Update module_progress for a user/module based on graded submissions.
 * Module is "passed" when all its assessments have a graded submission and weighted average >= pass_mark.
 */
export async function updateModuleProgress(userId: string, moduleId: string): Promise<'passed' | 'in_progress'> {
  const supabase = createServiceClient()

  const { data: module } = await supabase
    .from('modules')
    .select('id, pass_mark')
    .eq('id', moduleId)
    .single()
  if (!module) return 'in_progress'

  const passMark = module.pass_mark ?? 50

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, total_marks, weight')
    .eq('module_id', moduleId)
  if (!assessments?.length) {
    // No quiz or assignment: the module is complete once every unit is done.
    // A module with neither units nor assessments stays in progress.
    const { data: units } = await supabase.from('units').select('id').eq('module_id', moduleId)
    const unitIds = (units ?? []).map((u) => u.id)
    let passed = false
    if (unitIds.length > 0) {
      const { data: completions } = await supabase
        .from('unit_completions')
        .select('unit_id')
        .eq('user_id', userId)
        .in('unit_id', unitIds)
      const done = new Set((completions ?? []).map((c) => c.unit_id))
      passed = unitIds.every((id) => done.has(id))
    }
    await supabase.from('module_progress').upsert(
      {
        user_id: userId,
        module_id: moduleId,
        status: passed ? 'passed' : 'in_progress',
        completed_at: passed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,module_id' }
    )
    return passed ? 'passed' : 'in_progress'
  }

  const scores: number[] = []
  const weights: number[] = []
  let allGraded = true

  for (const a of assessments) {
    const { data: sub } = await supabase
      .from('submissions')
      .select('marks_obtained, status')
      .eq('user_id', userId)
      .eq('assessment_id', a.id)
      .maybeSingle()
    if (!sub || sub.status !== 'graded' || sub.marks_obtained == null) {
      allGraded = false
      break
    }
    const pct = a.total_marks > 0 ? (sub.marks_obtained / a.total_marks) * 100 : 0
    scores.push(pct)
    weights.push(a.weight ?? 0)
  }

  if (!allGraded || scores.length === 0) {
    await supabase.from('module_progress').upsert(
      { user_id: userId, module_id: moduleId, status: 'in_progress' },
      { onConflict: 'user_id,module_id' }
    )
    return 'in_progress'
  }

  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const normalizedWeights = totalWeight > 0 ? weights.map(w => (w / totalWeight) * 100) : weights
  const moduleMark = calculateModuleMark(scores, normalizedWeights)
  const passed = moduleMark >= passMark

  await supabase.from('module_progress').upsert(
    {
      user_id: userId,
      module_id: moduleId,
      status: passed ? 'passed' : 'in_progress',
      completed_at: passed ? new Date().toISOString() : null,
    },
    { onConflict: 'user_id,module_id' }
  )
  return passed ? 'passed' : 'in_progress'
}

function skipped(reason: 'no_modules' | 'incomplete' | 'tuition_incomplete'): ProgressCertificateResult {
  return { ok: true, created: false, certificateId: null, reason }
}

/**
 * Refresh module progress for all modules in a course, then issue one Certificate
 * of Completion when every module is passed and full tuition is confirmed.
 * The service role writes the row. RLS is not widened: certificates has a SELECT
 * policy only, and verification_url is a required column with no default.
 * Insert and lookup failures are logged without addresses and returned.
 */
export async function refreshProgressAndCertificate(userId: string, courseId: string): Promise<ProgressCertificateResult> {
  const supabase = createServiceClient()

  const { data: modules } = await supabase
    .from('modules')
    .select('id, sequence')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true })
  if (!modules?.length) return skipped('no_modules')

  for (const m of modules) {
    await updateModuleProgress(userId, m.id)
  }

  const { data: progressList } = await supabase
    .from('module_progress')
    .select('status')
    .eq('user_id', userId)
    .in('module_id', modules.map(m => m.id))

  const allPassed =
    progressList?.length === modules.length &&
    progressList.every(p => p.status === 'passed')

  const tuition = await tuitionForUserCourse(userId, courseId)
  const decision = completionIssueDecision({
    moduleCount: modules.length,
    allPassed,
    position: tuition.position,
    enrollmentStatus: tuition.status,
    accessOverride: tuition.accessOverride,
  })
  if (decision.action === 'skip') return skipped(decision.reason)

  return persistCompletionCertificate({
    userId,
    courseId,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    now: () => new Date().toISOString(),
    newId: () => crypto.randomUUID(),
    newNumber: generateCertificateNumber,
    find: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle()
      return { id: data?.id ?? null, error: error ? { code: error.code, message: error.message } : null }
    },
    insert: async (row) => {
      const { data, error } = await supabase.from('certificates').insert(row).select('id').single()
      return { id: data?.id ?? null, error: error ? { code: error.code, message: error.message } : null }
    },
    notify: async (certificateNumber) => {
      const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', userId).single()
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      const { data: courseRow } = await supabase.from('courses').select('title').eq('id', courseId).single()
      if (email && courseRow?.title) {
        await sendCertificateIssuedEmail(email, profile?.first_name ?? 'Learner', courseRow.title, certificateNumber)
      }
    },
  })
}

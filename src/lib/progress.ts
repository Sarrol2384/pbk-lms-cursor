import { createServiceClient } from '@/lib/supabase/server'
import { calculateModuleMark, generateCertificateNumber } from '@/lib/utils'
import { sendCertificateIssuedEmail } from '@/lib/email'

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
    await supabase.from('module_progress').upsert(
      { user_id: userId, module_id: moduleId, status: 'in_progress' },
      { onConflict: 'user_id,module_id' }
    )
    return 'in_progress'
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

/**
 * Refresh module progress for all modules in a course (in sequence), then issue certificate if all passed.
 * Call after grading a submission or when loading student course view.
 */
export async function refreshProgressAndCertificate(userId: string, courseId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: modules } = await supabase
    .from('modules')
    .select('id, sequence')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true })
  if (!modules?.length) return

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

  if (!allPassed) return

  const { data: existing } = await supabase
    .from('certificates')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  if (existing) return

  const certNumber = generateCertificateNumber()
  await supabase.from('certificates').insert({
    user_id: userId,
    course_id: courseId,
    certificate_number: certNumber,
    issued_at: new Date().toISOString(),
  })
  try {
    const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', userId).single()
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const email = authUser?.user?.email
    const { data: courseRow } = await supabase.from('courses').select('title').eq('id', courseId).single()
    if (email && courseRow?.title) {
      await sendCertificateIssuedEmail(email, profile?.first_name ?? 'Learner', courseRow.title, certNumber)
    }
  } catch (_) { /* email best-effort */ }
}

import { createServiceClient } from '@/lib/supabase/server'
import { getPaymentDeadline } from '@/lib/utils'
import { updateModuleProgress } from '@/lib/progress'

type EnrollmentRow = {
  id: string
  status: string
  enrolled_at?: string | null
  created_at?: string | null
}

export type ActiveEnrollmentResult =
  | { ok: true; enrollmentId: string }
  | { ok: false; httpStatus: 403; error: string }

async function isOverdue(enrollment: EnrollmentRow): Promise<boolean> {
  const service = createServiceClient()
  const { data: payments } = await service
    .from('payments')
    .select('amount, amount_paid, created_at, total_installments')
    .eq('enrollment_id', enrollment.id)
    .order('created_at', { ascending: true })

  const total = (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const paid = (payments ?? []).reduce((sum, p) => sum + (p.amount_paid ?? 0), 0)
  if (total - paid <= 0) return false

  const totalInstallments = Math.max(1, payments?.[0]?.total_installments ?? 1)
  const startDate = enrollment.enrolled_at ?? payments?.[0]?.created_at ?? enrollment.created_at
  return getPaymentDeadline(startDate, totalInstallments).isOverdue
}

/**
 * Course content is open only while the enrolment is approved and the payment plan is not past its deadline.
 * A past deadline moves the row to on_hold.
 */
export async function requireActiveEnrollment(userId: string, courseId: string): Promise<ActiveEnrollmentResult> {
  const service = createServiceClient()
  const { data: enrollment } = await service
    .from('enrollments')
    .select('id, status, enrolled_at, created_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) return { ok: false, httpStatus: 403, error: 'Not enrolled' }

  if (enrollment.status === 'approved') {
    if (await isOverdue(enrollment)) {
      await service.from('enrollments').update({ status: 'on_hold' }).eq('id', enrollment.id).eq('status', 'approved')
      return { ok: false, httpStatus: 403, error: 'Course access is on hold until the balance is paid' }
    }
    return { ok: true, enrollmentId: enrollment.id }
  }

  if (enrollment.status === 'on_hold') {
    return { ok: false, httpStatus: 403, error: 'Course access is on hold' }
  }
  return { ok: false, httpStatus: 403, error: 'Enrolment is not active' }
}

/** Used by the dashboard, which already holds enrolment rows and reloads after a hold. */
export async function suspendEnrollmentIfOverdue(enrollment: EnrollmentRow & { status: string }): Promise<boolean> {
  if (enrollment.status !== 'approved') return false
  if (!(await isOverdue(enrollment))) return false
  const service = createServiceClient()
  await service.from('enrollments').update({ status: 'on_hold' }).eq('id', enrollment.id).eq('status', 'approved')
  return true
}

export async function assertPreviousModulePassed(
  userId: string,
  courseId: string,
  moduleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient()
  const { data: modules } = await service
    .from('modules')
    .select('id, sequence')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true })

  const list = modules ?? []
  const idx = list.findIndex((m) => m.id === moduleId)
  if (idx === -1) return { ok: false, error: 'Module not found' }
  if (idx === 0) return { ok: true }

  const previous = list[idx - 1]
  const status = await updateModuleProgress(userId, previous.id)
  if (status !== 'passed') {
    return { ok: false, error: 'Complete and pass the previous module first' }
  }
  return { ok: true }
}

export async function assertAllUnitsComplete(
  userId: string,
  moduleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient()
  const { data: units } = await service.from('units').select('id').eq('module_id', moduleId)
  const unitIds = (units ?? []).map((u) => u.id)
  if (unitIds.length === 0) return { ok: true }

  const { data: completions } = await service
    .from('unit_completions')
    .select('unit_id')
    .eq('user_id', userId)
    .in('unit_id', unitIds)
  const done = new Set((completions ?? []).map((c) => c.unit_id))
  if (!unitIds.every((id) => done.has(id))) {
    return { ok: false, error: 'Complete all units before this assessment' }
  }
  return { ok: true }
}

/**
 * Sets status to approved. Writes enrolled_at only when it is still empty, so a later
 * instalment or lifting on_hold does not move the payment deadline or look like a new enrolment.
 * firstApproval is true only when enrolled_at was empty (welcome email should fire then).
 */
export async function approveEnrollmentFirstTime(enrollmentId: string): Promise<{ firstApproval: boolean }> {
  const service = createServiceClient()
  const { data: enrollment, error } = await service
    .from('enrollments')
    .select('id, status, enrolled_at')
    .eq('id', enrollmentId)
    .single()
  if (error || !enrollment) throw new Error('Enrollment not found')

  const firstApproval = !enrollment.enrolled_at
  const updates: { status: string; enrolled_at?: string } = { status: 'approved' }
  if (!enrollment.enrolled_at) updates.enrolled_at = new Date().toISOString()

  if (enrollment.status !== 'approved' || !enrollment.enrolled_at) {
    const { error: updateErr } = await service.from('enrollments').update(updates).eq('id', enrollmentId)
    if (updateErr) throw new Error(updateErr.message)
  }
  return { firstApproval }
}

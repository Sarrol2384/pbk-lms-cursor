import { createServiceClient } from '@/lib/supabase/server'
import { assessTuition, canIssueCompletionDocument, type TuitionPosition } from '@/lib/tuition'

export async function tuitionForUserCourse(userId: string, courseId: string): Promise<{
  enrollmentId: string | null
  status: string | null
  position: TuitionPosition
}> {
  const service = createServiceClient()
  const { data: enrollment } = await service
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  if (!enrollment) {
    return { enrollmentId: null, status: null, position: assessTuition([]) }
  }
  const { data: payments } = await service
    .from('payments')
    .select('amount, amount_paid, total_installments, installment_amount')
    .eq('enrollment_id', enrollment.id)
    .order('installment_number', { ascending: true })
  return {
    enrollmentId: enrollment.id,
    status: enrollment.status,
    position: assessTuition(payments ?? []),
  }
}

export async function completionDocumentAllowed(userId: string, courseId: string): Promise<boolean> {
  const tuition = await tuitionForUserCourse(userId, courseId)
  return canIssueCompletionDocument(tuition.position, tuition.status)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * DELETE: Force-remove an enrollment by its id.
 * Cleans up related data (submissions, progress, certificates, payments) for
 * that user+course even if the user no longer exists.
 * Super admin only.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ enrollmentId: string }> | { enrollmentId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can remove enrollments.' }, { status: 403 })
  }

  const params = await Promise.resolve(context.params)
  const enrollmentId = params.enrollmentId
  const { searchParams } = new URL(req.url)
  const userIdQ = searchParams.get('user_id')
  const courseIdQ = searchParams.get('course_id')

  const service = createServiceClient()

  // Try to get enrollment info for cascading cleanup
  let userId = userIdQ
  let courseId = courseIdQ

  if (enrollmentId && enrollmentId !== 'undefined') {
    const { data: row } = await service
      .from('enrollments')
      .select('user_id, course_id')
      .eq('id', enrollmentId)
      .maybeSingle()
    if (row) {
      userId = row.user_id
      courseId = row.course_id
    }
  }

  // Clean related data if we know user+course
  if (userId && courseId) {
    const { data: modules } = await service.from('modules').select('id').eq('course_id', courseId)
    const moduleIds = (modules ?? []).map((m) => m.id)

    if (moduleIds.length > 0) {
      const { data: units } = await service.from('units').select('id').in('module_id', moduleIds)
      const unitIds = (units ?? []).map((u) => u.id)
      const { data: assessments } = await service.from('assessments').select('id').in('module_id', moduleIds)
      const assessmentIds = (assessments ?? []).map((a) => a.id)

      if (assessmentIds.length > 0) {
        await service.from('submissions').delete().eq('user_id', userId).in('assessment_id', assessmentIds)
      }
      if (unitIds.length > 0) {
        await service.from('unit_completions').delete().eq('user_id', userId).in('unit_id', unitIds)
      }
      await service.from('module_progress').delete().eq('user_id', userId).in('module_id', moduleIds)
    }
    await service.from('certificates').delete().eq('user_id', userId).eq('course_id', courseId)
  }

  // Unlink payments and delete the enrollment directly
  if (enrollmentId && enrollmentId !== 'undefined') {
    await service.from('payments').update({ enrollment_id: null }).eq('enrollment_id', enrollmentId)
    const { error } = await service.from('enrollments').delete().eq('id', enrollmentId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Fallback: delete by user_id + course_id
  if (userId && courseId) {
    await service.from('enrollments').delete().eq('user_id', userId).eq('course_id', courseId)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'No enrollment id or user_id+course_id provided.' }, { status: 400 })
}

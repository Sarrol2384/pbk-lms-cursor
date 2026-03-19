import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST: Clean orphan data.
 * Body: { full?: boolean } — if full=true, removes ALL enrollments, payments, and student profiles.
 * Otherwise only removes orphan data (user no longer in profiles).
 * Super admin only.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can run cleanup.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { full?: boolean }
  const fullReset = body.full === true

  const service = createServiceClient()
  const log: string[] = []

  if (fullReset) {
    // Full reset: remove all enrollments, payments, and student profiles/auth
    const { data: allEnrollments } = await service.from('enrollments').select('id, user_id')
    const enrollmentIds = (allEnrollments ?? []).map((e) => e.id)

    if (enrollmentIds.length > 0) {
      await service.from('payments').update({ enrollment_id: null }).in('enrollment_id', enrollmentIds)
    }
    if (enrollmentIds.length > 0) {
      await service.from('enrollments').delete().in('id', enrollmentIds)
      log.push(`Removed ${enrollmentIds.length} enrollment(s)`)
    }

    const { data: allPayments } = await service.from('payments').select('id')
    const paymentIds = (allPayments ?? []).map((p) => p.id)
    if (paymentIds.length > 0) {
      await service.from('payments').delete().in('id', paymentIds)
      log.push(`Removed ${paymentIds.length} payment(s)`)
    }

    // Get ALL student IDs from profiles (not just from enrollments - they may have none)
    const { data: studentProfiles } = await service.from('profiles').select('id').eq('role', 'student')
    const studentIds = (studentProfiles ?? []).map((p) => p.id).filter((id) => id !== user.id)

    // Delete student-related data for ALL students (submissions may use enrollment_id; unit_completions/module_progress use user_id)
    if (studentIds.length > 0) {
      await service.from('submissions').delete().in('user_id', studentIds)
      await service.from('unit_completions').delete().in('user_id', studentIds)
      await service.from('module_progress').delete().in('user_id', studentIds)
      await service.from('certificates').delete().in('user_id', studentIds)
    }

    // Delete auth users (profile cascades if profiles.id REFERENCES auth.users ON DELETE CASCADE).
    // If that fails (e.g. schema differs), delete profile first then auth user.
    const authErrors: string[] = []
    for (const uid of studentIds) {
      try {
        await service.auth.admin.deleteUser(uid)
      } catch {
        // Fallback: delete profile first, then auth user (for schemas without CASCADE)
        const { error: profileErr } = await service.from('profiles').delete().eq('id', uid)
        if (profileErr) {
          try {
            await service.auth.admin.deleteUser(uid)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            authErrors.push(`${uid.slice(0, 8)} auth: ${msg}`)
            // Auth deletion failed (e.g. Supabase restrictions). Mark profile so they don't count as students.
            await service.from('profiles').update({ role: 'removed' }).eq('id', uid)
          }
        } else {
          try {
            await service.auth.admin.deleteUser(uid)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            authErrors.push(`${uid.slice(0, 8)} auth: ${msg}`)
            // Profile already deleted; auth user remains but won't count (no profile)
          }
        }
      }
    }
    if (studentIds.length > 0) log.push(`Removed ${studentIds.length} student(s)`)
    if (authErrors.length > 0) {
      log.push(`Issues: ${authErrors.join('; ')}`)
    }

    if (log.length === 0) log.push('Nothing to reset.')
  } else {
    // Orphan-only cleanup
    const { data: allProfiles } = await service.from('profiles').select('id')
    const profileIds = new Set((allProfiles ?? []).map((p) => p.id))

    const { data: allEnrollments } = await service.from('enrollments').select('id, user_id')
    const orphanEnrollments = (allEnrollments ?? []).filter((e) => !profileIds.has(e.user_id))
    if (orphanEnrollments.length > 0) {
      const ids = orphanEnrollments.map((e) => e.id)
      const userIds = orphanEnrollments.map((e) => e.user_id)
      await service.from('payments').update({ enrollment_id: null }).in('enrollment_id', ids)
      await service.from('enrollments').delete().in('id', ids)
      log.push(`Removed ${ids.length} orphan enrollment(s)`)
      await service.from('submissions').delete().in('user_id', userIds)
      await service.from('unit_completions').delete().in('user_id', userIds)
      await service.from('module_progress').delete().in('user_id', userIds)
      await service.from('certificates').delete().in('user_id', userIds)
    }

    const { data: allPayments } = await service.from('payments').select('id, user_id')
    const orphanPayments = (allPayments ?? []).filter((p) => !profileIds.has(p.user_id))
    if (orphanPayments.length > 0) {
      await service.from('payments').delete().in('id', orphanPayments.map((p) => p.id))
      log.push(`Removed ${orphanPayments.length} orphan payment(s)`)
    }

    if (log.length === 0) log.push('No orphan data found.')
  }

  revalidatePath('/admin', 'layout')
  return NextResponse.json({ success: true, log })
}

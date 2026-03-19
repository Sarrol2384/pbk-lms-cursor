import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshProgressAndCertificate } from '@/lib/progress'

/**
 * POST body: { userId: string, courseId: string }
 * Admin-only. Marks all units complete and all assessments as graded (full marks)
 * for that enrollment, then runs refreshProgressAndCertificate so a certificate
 * is issued. Use for fast testing of the application → certificate flow.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const userId = body.userId as string | undefined
  const courseId = body.courseId as string | undefined
  if (!userId || !courseId) {
    return NextResponse.json({ error: 'userId and courseId required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: enrollment } = await service
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  if (enrollment.status !== 'approved') {
    await service
      .from('enrollments')
      .update({ status: 'approved', enrolled_at: new Date().toISOString() })
      .eq('id', enrollment.id)
  }

  const { data: modules } = await service
    .from('modules')
    .select('id')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true })

  if (!modules?.length) {
    return NextResponse.json({ error: 'Course has no modules' }, { status: 400 })
  }

  const moduleIds = modules.map((m) => m.id)

  const { data: units } = await service
    .from('units')
    .select('id')
    .in('module_id', moduleIds)

  if (units?.length) {
    await service.from('unit_completions').upsert(
      units.map((u) => ({
        user_id: userId,
        unit_id: u.id,
        completed_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,unit_id' }
    )
  }

  const { data: assessments } = await service
    .from('assessments')
    .select('id, total_marks')
    .in('module_id', moduleIds)

  if (!assessments?.length) {
    return NextResponse.json({
      success: false,
      error: 'No certificate created: this course has no assessments. Add at least one quiz or assignment to each module, then try Fast-track again.',
    }, { status: 400 })
  }

  for (const a of assessments) {
    const marks = a.total_marks ?? 100
    const { data: existing } = await service
      .from('submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_id', a.id)
      .maybeSingle()
    if (existing) {
      await service.from('submissions').update({
        marks_obtained: marks,
        status: 'graded',
        submitted_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await service.from('submissions').insert({
        user_id: userId,
        assessment_id: a.id,
        marks_obtained: marks,
        status: 'graded',
        submitted_at: new Date().toISOString(),
      })
    }
  }

  await refreshProgressAndCertificate(userId, courseId)

  const { data: cert } = await service
    .from('certificates')
    .select('id, certificate_number')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (cert) {
    return NextResponse.json({
      success: true,
      message: `Certificate issued (${cert.certificate_number}). View under Admin → Certificates or have the student open their course / Certificates page.`,
    })
  }

  // Diagnose why no certificate: which modules have no assessments or didn't pass
  const { data: modulesWithMeta } = await service
    .from('modules')
    .select('id, title, sequence, pass_mark')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true })

  const { data: progressRows } = await service
    .from('module_progress')
    .select('module_id, status')
    .eq('user_id', userId)
    .in('module_id', moduleIds)

  const progressByModule = new Map((progressRows ?? []).map((p) => [p.module_id, p.status as string]))

  const { data: assessmentCounts } = await service
    .from('assessments')
    .select('module_id')
    .in('module_id', moduleIds)

  const countByModule = new Map<string, number>()
  for (const row of assessmentCounts ?? []) {
    countByModule.set(row.module_id, (countByModule.get(row.module_id) ?? 0) + 1)
  }

  const details = (modulesWithMeta ?? []).map((m) => {
    const count = countByModule.get(m.id) ?? 0
    const status = progressByModule.get(m.id) ?? 'in_progress'
    const block = count === 0 ? ' (no assessments — add at least one quiz/assignment)' : status !== 'passed' ? ` (status: ${status})` : ''
    return `Module ${m.sequence} "${m.title}": ${count} assessment(s), ${status}${block}`
  }).join('. ')

  return NextResponse.json({
    success: false,
    error: 'Fast-track ran but no certificate was issued.',
    detail: details || 'No module data.',
  }, { status: 400 })
}

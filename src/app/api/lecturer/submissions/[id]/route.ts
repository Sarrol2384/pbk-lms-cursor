import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshProgressAndCertificate } from '@/lib/progress'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile.data?.role
  if (role !== 'lecturer' && role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { marks_obtained, feedback } = body
  if (typeof marks_obtained !== 'number' || marks_obtained < 0) {
    return NextResponse.json({ error: 'Valid marks_obtained required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: sub } = await service.from('submissions').select('id, user_id, assessment_id').eq('id', params.id).single()
  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  const { data: assessment } = await service.from('assessments').select('module_id').eq('id', sub.assessment_id).single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  const { data: moduleRow } = await service.from('modules').select('course_id').eq('id', assessment.module_id).single()
  const courseId = moduleRow?.course_id
  if (!courseId) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { error } = await service.from('submissions').update({
    marks_obtained,
    feedback: feedback ?? null,
    status: 'graded',
  }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await refreshProgressAndCertificate(sub.user_id, courseId)
  return NextResponse.json({ success: true })
}

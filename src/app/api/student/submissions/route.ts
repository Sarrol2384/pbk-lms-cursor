import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assessmentId, fileUrl } = await request.json()
  if (!assessmentId || !fileUrl) return NextResponse.json({ error: 'assessmentId and fileUrl required' }, { status: 400 })

  const service = createServiceClient()
  const { data: assessment } = await service.from('assessments').select('id, module_id').eq('id', assessmentId).single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const { data: module } = await service.from('modules').select('course_id').eq('id', assessment.module_id).single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { data: enrollment } = await service.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', module.course_id).eq('status', 'approved').single()
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  const { data: existing } = await service.from('submissions').select('id').eq('user_id', user.id).eq('assessment_id', assessmentId).maybeSingle()
  if (existing) {
    const { error } = await service.from('submissions').update({ file_url: fileUrl, status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, submissionId: existing.id })
  }

  const { data: row, error } = await service.from('submissions').insert({
    user_id: user.id,
    assessment_id: assessmentId,
    file_url: fileUrl,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, submissionId: row.id })
}

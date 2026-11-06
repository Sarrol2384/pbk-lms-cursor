import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireActiveEnrollment } from '@/lib/enrollment-access'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const assessmentId = formData.get('assessmentId')
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (typeof assessmentId !== 'string' || !assessmentId) {
    return NextResponse.json({ error: 'assessmentId required' }, { status: 400 })
  }
  if (file.size <= 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use PDF, Word, JPG or PNG.' }, { status: 400 })

  const service = createServiceClient()
  const { data: assessment } = await service.from('assessments').select('id, module_id').eq('id', assessmentId).single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  const { data: module } = await service.from('modules').select('course_id').eq('id', assessment.module_id).single()
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  const access = await requireActiveEnrollment(user.id, module.course_id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus })

  const path = `submissions/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await service.storage
    .from('submissions')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signed, error: signErr } = await service.storage.from('submissions').createSignedUrl(path, 60 * 60)
  return NextResponse.json({ path, url: signErr ? null : signed?.signedUrl ?? null })
}

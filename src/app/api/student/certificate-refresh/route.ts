import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refreshProgressAndCertificate } from '@/lib/progress'

/** Retry Certificate of Completion issuance for the signed-in student. */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const courseId = body.courseId
  if (typeof courseId !== 'string' || !courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  const result = await refreshProgressAndCertificate(user.id, courseId)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    certificateId: result.certificateId,
    created: result.created,
    reason: result.reason,
  })
}

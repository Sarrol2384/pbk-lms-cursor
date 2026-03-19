import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST: Renumber all modules in the course to sequence 1, 2, 3, ... (by current sequence order).
 * Use after deleting modules so the list shows 1, 2, 3 instead of 1, 4, 5, 7, 13.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const courseId = params.courseId
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const service = createServiceClient()
  const { data: modules } = await service
    .from('modules')
    .select('id, sequence')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true })

  if (!modules?.length) return NextResponse.json({ success: true, updated: 0 })

  for (let i = 0; i < modules.length; i++) {
    await service.from('modules').update({ sequence: i + 1 }).eq('id', modules[i].id)
  }

  return NextResponse.json({ success: true, updated: modules.length })
}

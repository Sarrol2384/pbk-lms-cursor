import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// DELETE /api/admin/users/[userId]
// Remove a user profile if they have no enrollments.
// Only super_admin may delete.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can remove users.' }, { status: 403 })
  }

  const userId = params.userId
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  // Do not allow removing your own account
  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot remove your own account.' }, { status: 400 })
  }

  const service = createServiceClient()

  // For students, block if they have any enrollments (must remove enrollments first)
  const { data: targetProfile } = await service.from('profiles').select('role').eq('id', userId).single()
  if (targetProfile?.role === 'student') {
    const { count, error: countError } = await service
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot remove this user because they are enrolled in one or more courses. Remove their enrollments first (Admin → Enrollments), then remove the user.',
        },
        { status: 400 }
      )
    }
  }

  const { error: delError } = await service.from('profiles').delete().eq('id', userId)
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }
  try {
    await service.auth.admin.deleteUser(userId)
  } catch {
    // Profile already removed; auth cleanup best-effort
  }
  return NextResponse.json({ success: true })
}


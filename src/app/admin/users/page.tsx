import { createClient, createServiceClient } from '@/lib/supabase/server'
import UsersTable, { UserRow } from '@/components/admin/UsersTable'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  const service = createServiceClient()
  const { data: profiles } = await service
    .from('profiles')
    .select('id, first_name, last_name, email, phone, id_number, role, created_at')
    .order('created_at', { ascending: false })

  const rows = (profiles ?? []) as UserRow[]
  const students = rows.filter(r => r.role === 'student')
  const staff = rows.filter(r => r.role !== 'student')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">
          View all users. Students can be removed only if they have no course enrollments (remove enrollments first via Enrollments). Admins can be removed by a super admin; you cannot remove your own account.
        </p>
      </div>
      <UsersTable students={students} staff={staff} currentUserId={currentUserId} />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentSidebar from '@/components/student/StudentSidebar'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (profile.role === 'super_admin' || profile.role === 'admin') redirect('/admin/dashboard')
  if (profile.role === 'lecturer') redirect('/lecturer/dashboard')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <StudentSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

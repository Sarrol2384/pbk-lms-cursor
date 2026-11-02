import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentSidebar from '@/components/student/StudentSidebar'
import AppShell from '@/components/shell/AppShell'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (profile.role === 'super_admin' || profile.role === 'admin') redirect('/admin/dashboard')
  if (profile.role === 'lecturer') redirect('/lecturer/dashboard')

  return (
    <AppShell sidebar={<StudentSidebar profile={profile} />}>
      {children}
    </AppShell>
  )
}

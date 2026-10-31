import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LecturerSidebar from '@/components/lecturer/LecturerSidebar'

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['lecturer', 'super_admin', 'admin'].includes(profile.role)) {
    redirect('/student/dashboard')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <LecturerSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

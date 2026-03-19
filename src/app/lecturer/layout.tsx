import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['lecturer', 'super_admin', 'admin'].includes(profile.role)) {
    redirect('/student/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8">{children}</div>
    </div>
  )
}

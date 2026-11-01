import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InstitutionLogo } from '@/components/marketing/InstitutionLogo'
import { getMarketingBranding } from '@/lib/marketing/branding'

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['lecturer', 'super_admin', 'admin'].includes(profile.role)) {
    redirect('/student/dashboard')
  }

  const branding = await getMarketingBranding()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <InstitutionLogo size="sidebar" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{branding.institutionName}</p>
            <p className="text-xs text-gray-400">Lecturer Portal</p>
          </div>
        </div>
      </header>
      <div className="p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  )
}

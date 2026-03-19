import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const service = createServiceClient()
  const { data } = await service
    .from('certificate_settings')
    .select('institution_name, logo_url')
    .limit(1)
    .single()

  const institutionName = data?.institution_name || 'PBK Management and Leadership Institute'
  const logoUrl = data?.logo_url ?? null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={institutionName} className="w-full h-full object-contain" />
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 6.075-4.925 11-11 11S1 18.075 1 12a12.08 12.08 0 012.84-7.757L12 14z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{institutionName}</h1>
        <p className="text-blue-200 text-sm">Learning Management System</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="text-blue-300 text-xs mt-8">
        <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
      </p>
    </div>
  )
}

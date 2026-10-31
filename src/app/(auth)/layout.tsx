import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { INSTITUTE_NAME } from '@/lib/institute'
import { InstitutionLogo } from '@/components/marketing/InstitutionLogo'

async function loadInstitutionName(): Promise<string> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return INSTITUTE_NAME
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('certificate_settings')
      .select('institution_name')
      .limit(1)
      .single()
    return data?.institution_name || INSTITUTE_NAME
  } catch {
    return INSTITUTE_NAME
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const institutionName = await loadInstitutionName()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <InstitutionLogo institutionName={institutionName} size="auth" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">{institutionName}</h1>
        <p className="text-blue-200 text-sm mt-1">Learning Management System</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="text-blue-300 text-xs mt-8">
        <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
      </p>
    </div>
  )
}

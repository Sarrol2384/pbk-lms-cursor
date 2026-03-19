import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CertificateSettingsForm } from './CertificateSettingsForm'

export default async function CertificateSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: settings } = await supabase.from('certificate_settings').select('*').limit(1).maybeSingle()

  const initial = {
    institution_name: settings?.institution_name ?? 'PBK Management and Leadership Institute',
    logo_url: settings?.logo_url ?? '',
    seal_url: settings?.seal_url ?? '',
    signature1_url: settings?.signature1_url ?? '',
    signature1_name: settings?.signature1_name ?? '',
    signature1_title: settings?.signature1_title ?? '',
    signature2_url: settings?.signature2_url ?? '',
    signature2_name: settings?.signature2_name ?? '',
    signature2_title: settings?.signature2_title ?? '',
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/certificates" className="text-sm text-blue-600 hover:underline">← Certificates</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Certificate design</h1>
        <p className="text-sm text-gray-500 mt-1">Set the logo and signatures used on issued certificates. Preview to confirm before students download.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <CertificateSettingsForm initial={initial} />
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview certificate</p>
          <p className="text-xs text-gray-500 mb-2">Opens a sample PDF with the current logo and signatures so you can verify they look correct.</p>
          <a
            href="/api/admin/certificate-preview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View certificate preview →
          </a>
        </div>
      </div>
    </div>
  )
}

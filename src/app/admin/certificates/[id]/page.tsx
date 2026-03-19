import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EditCertificateForm } from './EditCertificateForm'

export default async function AdminCertificateEditPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data: cert } = await supabase
    .from('certificates')
    .select('id, certificate_number, issued_at, user_id, course_id, profiles:user_id(first_name, last_name), courses:course_id(title, code)')
    .eq('id', params.id)
    .single()
  if (!cert) notFound()

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href="/admin/certificates" className="text-sm text-blue-600 hover:underline">← Certificates</Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">Edit certificate</h1>
        <p className="text-sm text-gray-500 mt-1">{(cert.profiles as any)?.first_name} {(cert.profiles as any)?.last_name} • {(cert.courses as any)?.title}</p>
        <EditCertificateForm certId={params.id} certificateNumber={cert.certificate_number} issuedAt={cert.issued_at} />
      </div>
    </div>
  )
}

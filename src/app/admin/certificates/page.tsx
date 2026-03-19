import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateShort } from '@/lib/utils'

export default async function AdminCertificatesPage() {
  const supabase = createServiceClient()
  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, certificate_number, issued_at, user_id, course_id, profiles:user_id(first_name, last_name, email), courses:course_id(title, code)')
    .order('issued_at', { ascending: false })

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-500 text-sm mt-1">View and edit issued certificates</p>
        </div>
        <Link href="/admin/certificate-settings" className="text-sm font-medium text-blue-600 hover:underline">
          Certificate design (logo & signatures) →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!certificates || certificates.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No certificates issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left p-4 font-medium text-gray-700">Student</th>
                  <th className="text-left p-4 font-medium text-gray-700">Course</th>
                  <th className="text-left p-4 font-medium text-gray-700">Certificate No.</th>
                  <th className="text-left p-4 font-medium text-gray-700">Issued</th>
                  <th className="text-left p-4 font-medium text-gray-700 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(certificates as any[]).map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{(c.profiles as any)?.first_name} {(c.profiles as any)?.last_name}</p>
                      <p className="text-xs text-gray-500">{(c.profiles as any)?.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-900">{(c.courses as any)?.title}</p>
                      <p className="text-xs text-gray-500">{(c.courses as any)?.code}</p>
                    </td>
                    <td className="p-4 font-mono text-gray-700">{c.certificate_number}</td>
                    <td className="p-4 text-gray-600">{formatDateShort(c.issued_at)}</td>
                    <td className="p-4">
                      <Link href={`/admin/certificates/${c.id}`} className="text-blue-600 hover:underline text-sm font-medium">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

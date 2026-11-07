import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { completionDocumentAllowed } from '@/lib/tuition-lookup'
import { parseCertificateVerificationPath, publicCertificateView } from '@/lib/certificate-public'

export const dynamic = 'force-dynamic'

function Unconfirmed() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Certificate could not be confirmed</h2>
      <p className="text-gray-500 text-sm">This link does not match a Certificate of Completion we can confirm. The formal certificate is presented on graduation day.</p>
    </div>
  )
}

export default async function PublicCertificatePage({ params }: { params: { id: string } }) {
  const id = parseCertificateVerificationPath(`/verify/${params.id}`)
  if (!id) notFound()

  const service = createServiceClient()
  const { data: cert, error } = await service
    .from('certificates')
    .select('id, certificate_number, issued_at, user_id, course_id, profiles:user_id(first_name, last_name), courses:course_id(title, code)')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[certificate] public verification lookup failed', { code: error.code })
    return <Unconfirmed />
  }
  if (!cert?.user_id || !cert.course_id || !cert.certificate_number) return <Unconfirmed />

  const allowed = await completionDocumentAllowed(cert.user_id, cert.course_id)
  if (!allowed) return <Unconfirmed />

  const profile = Array.isArray(cert.profiles) ? cert.profiles[0] : cert.profiles
  const course = Array.isArray(cert.courses) ? cert.courses[0] : cert.courses
  const view = publicCertificateView({
    certificateNumber: cert.certificate_number,
    firstName: profile?.first_name,
    lastName: profile?.last_name,
    programmeTitle: course?.title,
    programmeCode: course?.code,
    issuedAt: cert.issued_at,
  })

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <p className="text-xs font-medium uppercase tracking-wide text-green-700">Confirmed</p>
      <h2 className="text-xl font-bold text-gray-900 mt-1">Certificate of Completion</h2>
      <p className="text-sm text-gray-600 mt-3">{view.learnerName}</p>
      <p className="text-sm text-gray-900 font-medium mt-1">{view.programmeTitle}</p>
      {view.programmeCode && <p className="text-xs text-gray-500 mt-1">{view.programmeCode}</p>}
      <p className="text-sm text-gray-600 mt-4">No. <span className="font-medium text-gray-900">{view.certificateNumber}</span></p>
      <p className="text-sm text-gray-600">Issued {formatDate(view.issuedAt)}</p>
      <p className="text-xs text-gray-500 mt-4">This is a Certificate of Completion. The formal certificate is presented on graduation day and is not available here.</p>
    </div>
  )
}

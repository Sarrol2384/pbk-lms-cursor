import { createClient, createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { assessTuition, canIssueCompletionDocument } from '@/lib/tuition'
import { refreshProgressAndCertificate } from '@/lib/progress'
import { CertificateIssueRetry } from '@/components/student/CertificateIssueRetry'

export default async function StudentCertificatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const serviceForIssue = createServiceClient()
  const { data: approvedEnrollments } = await serviceForIssue
    .from('enrollments')
    .select('course_id, status')
    .eq('user_id', user.id)
    .eq('status', 'approved')
  const issueFailures: { courseId: string; message: string }[] = []
  for (const enrollment of approvedEnrollments ?? []) {
    if (!enrollment.course_id) continue
    const result = await refreshProgressAndCertificate(user.id, enrollment.course_id)
    if (!result.ok && result.error) issueFailures.push({ courseId: enrollment.course_id, message: result.error })
  }

  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, course_id, certificate_number, issued_at, courses:course_id(title, code, nqf_level, credits)')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  const service = createServiceClient()
  const courseIds = (certificates ?? []).map((c: { course_id?: string }) => c.course_id).filter(Boolean) as string[]
  const downloadable = new Set<string>()
  if (courseIds.length > 0) {
    const { data: enrollments } = await service.from('enrollments').select('id, course_id, status').eq('user_id', user.id).in('course_id', courseIds)
    const enrollmentIds = (enrollments ?? []).map((e: { id: string }) => e.id)
    const { data: payments } = enrollmentIds.length
      ? await service.from('payments').select('enrollment_id, amount, amount_paid, total_installments, installment_amount').in('enrollment_id', enrollmentIds)
      : { data: [] as { enrollment_id: string; amount?: number; amount_paid?: number; total_installments?: number; installment_amount?: number }[] }
    for (const enrollment of enrollments ?? []) {
      const rows = (payments ?? []).filter((p: { enrollment_id: string }) => p.enrollment_id === enrollment.id)
      if (canIssueCompletionDocument(assessTuition(rows), enrollment.status)) downloadable.add(enrollment.course_id)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Certificates of Completion</h1>
        <p className="text-gray-500 text-sm mt-1">Downloadable completion documents</p>
        <p className="text-sm text-gray-600 mt-2 max-w-xl">
          A Certificate of Completion is generated when you <strong>pass all modules</strong> and <strong>full tuition is confirmed</strong>. The formal certificate is presented on graduation day and is not downloaded here.
        </p>
      </div>

      {issueFailures.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-red-950">Certificate of Completion could not be saved</p>
          <p className="text-sm text-red-900 mt-1">{issueFailures[0].message}</p>
          <CertificateIssueRetry courseId={issueFailures[0].courseId} />
        </div>
      )}

      {(!certificates || certificates.length === 0) && issueFailures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <p className="font-semibold text-gray-900 mb-1">No completion documents yet</p>
          <p className="text-sm text-gray-500 mb-4">Pass every module and finish full tuition to receive a Certificate of Completion.</p>
          <p className="text-xs text-gray-400">The formal certificate is presented on graduation day.</p>
        </div>
      ) : certificates && certificates.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {(certificates as any[]).map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center text-2xl shrink-0">🏆</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{(c.courses as any)?.title || 'Certificate of Completion'}</h3>
                  {(c.courses as any)?.code ? (
                    <p className="text-xs text-gray-500 mt-0.5">{(c.courses as any)?.code} • NQF {(c.courses as any)?.nqf_level}</p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-1">Certificate of Completion No: <span className="font-medium text-gray-600">{c.certificate_number}</span></p>
                  <p className="text-xs text-gray-400">Issued: {formatDate(c.issued_at)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {downloadable.has(c.course_id) ? (
                  <>
                    <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-block">View Certificate of Completion</a>
                    <a href={`/api/certificates/${c.id}/pdf`} download className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors inline-block">Download PDF</a>
                  </>
                ) : (
                  <p className="text-xs text-amber-800">Download stays closed until full tuition is confirmed.</p>
                )}
                <a href={`/verify/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:underline">Verify</a>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

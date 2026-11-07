import Link from 'next/link'
import { CertificateIssueRetry } from '@/components/student/CertificateIssueRetry'
import { certificatePdfPath } from '@/lib/certificate-public'

type Props = {
  moduleCount: number
  passedCount: number
  issued: boolean
  downloadable: boolean
  certificateId?: string
  issueError?: string | null
  courseId?: string
}

/** Completion document only. The formal certificate is presented on graduation day. */
export function CompletionNotice({ moduleCount, passedCount, issued, downloadable, certificateId, issueError, courseId }: Props) {
  const ready = issued && downloadable && certificateId
  const saveFailed = !issued && !!issueError && passedCount === moduleCount
  return (
    <div className={`rounded-xl border p-5 mb-6 ${ready ? 'bg-green-50 border-green-200' : saveFailed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🏆</span>
        <div>
          <h3 className="font-semibold text-gray-900">
            {ready ? 'Your Certificate of Completion is ready' : 'Certificate of Completion'}
          </h3>
          {ready ? (
            <p className="text-sm text-gray-700 mt-1">
              You have passed all {moduleCount} module{moduleCount !== 1 ? 's' : ''} and full tuition is confirmed. Download the Certificate of Completion below. The formal certificate is presented on graduation day and is not available here.
            </p>
          ) : saveFailed ? (
            <p className="text-sm text-red-900 mt-1">{issueError}</p>
          ) : issued && !downloadable ? (
            <p className="text-sm text-gray-700 mt-1">
              A completion record exists, but the download stays closed until full tuition is confirmed. The formal certificate is presented on graduation day.
            </p>
          ) : (
            <p className="text-sm text-gray-700 mt-1">
              {passedCount} of {moduleCount} module{moduleCount !== 1 ? 's' : ''} passed. A Certificate of Completion is issued only after every module is passed and full tuition is confirmed. The formal certificate is presented on graduation day and is not downloaded from the LMS.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {ready ? (
              <>
                <a href={certificatePdfPath(certificateId)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-700 hover:text-green-800 underline">
                  View Certificate of Completion
                </a>
                <a href={certificatePdfPath(certificateId)} download className="text-sm font-medium text-green-700 hover:text-green-800 underline">
                  Download PDF
                </a>
                <Link href="/student/certificates" className="text-sm font-medium text-green-700 hover:text-green-800 underline">
                  All completion documents
                </Link>
              </>
            ) : saveFailed && courseId ? (
              <CertificateIssueRetry courseId={courseId} />
            ) : (
              <Link href="/student/certificates" className="text-sm font-medium text-amber-800 hover:text-amber-900 underline">
                How completion documents work
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

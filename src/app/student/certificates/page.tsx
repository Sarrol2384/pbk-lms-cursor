import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function StudentCertificatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, certificate_number, issued_at, courses:course_id(title, code, nqf_level, credits)')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-gray-500 text-sm mt-1">Your earned qualifications</p>
        <p className="text-sm text-gray-600 mt-2 max-w-xl">
          A certificate is generated automatically when you <strong>pass all modules</strong> in a course at each module&apos;s required pass mark. View or download yours below.
        </p>
      </div>

      {!certificates || certificates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <p className="font-semibold text-gray-900 mb-1">No certificates yet</p>
          <p className="text-sm text-gray-500 mb-4">Complete all modules in a course to earn your certificate.</p>
          <p className="text-xs text-gray-400">Go to My Courses → open a course → pass each module in order. Your certificate will appear here when you have passed every module.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(certificates as any[]).map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center text-2xl shrink-0">🏆</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{(c.courses as any)?.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{(c.courses as any)?.code} • NQF {(c.courses as any)?.nqf_level}</p>
                  <p className="text-xs text-gray-400 mt-1">Certificate No: <span className="font-medium text-gray-600">{c.certificate_number}</span></p>
                  <p className="text-xs text-gray-400">Issued: {formatDate(c.issued_at)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-block">View certificate</a>
                <a href={`/api/certificates/${c.id}/pdf`} download className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors inline-block">Download PDF</a>
                <a href={`/verify/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:underline">Verify</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

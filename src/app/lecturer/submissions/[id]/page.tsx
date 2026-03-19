import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GradeSubmissionForm } from './GradeSubmissionForm'

export default async function LecturerSubmissionPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: sub } = await supabase
    .from('submissions')
    .select('id, file_url, status, marks_obtained, feedback, submitted_at, assessment_id, user_id')
    .eq('id', params.id)
    .single()
  if (!sub) notFound()

  const { data: assessment } = await supabase.from('assessments').select('id, title, type, total_marks').eq('id', sub.assessment_id).single()
  const { data: profile } = await supabase.from('profiles').select('first_name, last_name, email').eq('id', sub.user_id).single()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/lecturer/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">Grade submission</h1>
        <p className="text-sm text-gray-500 mt-1">{assessment?.title} • {assessment?.type?.replace(/_/g, ' ')}</p>
        <p className="text-sm text-gray-700 mt-2">
          Student: {profile?.first_name} {profile?.last_name} {profile?.email && `(${profile.email})`}
        </p>
        <p className="text-xs text-gray-500 mt-1">Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('en-ZA') : '—'}</p>
        {sub.file_url && (
          <p className="mt-3">
            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View submission file ↗</a>
          </p>
        )}
        {sub.status === 'graded' && (
          <p className="mt-2 text-sm text-green-700">Currently graded: {sub.marks_obtained} / {assessment?.total_marks ?? '—'}</p>
        )}
        <GradeSubmissionForm submissionId={params.id} totalMarks={assessment?.total_marks ?? 100} currentMarks={sub.marks_obtained} currentFeedback={sub.feedback} />
      </div>
    </div>
  )
}

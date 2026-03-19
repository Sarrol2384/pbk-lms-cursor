import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function LecturerDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, submitted_at, status, assessments:assessment_id(title, type, total_marks), profiles:user_id(first_name, last_name)')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })
    .limit(10)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.first_name}!</h1>
        <p className="text-gray-500 text-sm mt-1">Lecturer Dashboard</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pending Submissions to Grade</h2>
        </div>
        {!submissions || submissions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">No pending submissions</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(submissions as any[]).map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                  <p className="text-xs text-gray-500">{s.assessments?.title} • {s.assessments?.type?.replace(/_/g, ' ')}</p>
                </div>
                <Link href={`/lecturer/submissions/${s.id}`} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg">Grade</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StudentCoursesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [enrolledRes, allCoursesRes] = await Promise.all([
    supabase.from('enrollments').select('course_id, status, courses:course_id(id, title, code, nqf_level, credits, description)').eq('user_id', user.id),
    supabase.from('courses').select('id, title, code, nqf_level, credits, description').eq('status', 'published'),
  ])

  const enrolledCourseIds = new Set(enrolledRes.data?.map(e => e.course_id) ?? [])
  const enrolled = (enrolledRes.data ?? []) as any[]
  const available = (allCoursesRes.data ?? []).filter(c => !enrolledCourseIds.has(c.id))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500 text-sm mt-1">Your enrolled programmes and available courses</p>
      </div>

      {enrolled.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Enrolled Programmes</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {enrolled.map((e: any) => (
              <Link key={e.course_id} href={e.status === 'approved' ? `/student/courses/${e.course_id}` : `/student/enroll/${e.course_id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">{e.courses?.code?.substring(0, 2)}</div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.status === 'approved' ? 'bg-green-100 text-green-700' : e.status === 'on_hold' ? 'bg-orange-100 text-orange-700' : e.status === 'pending' || e.status === 'pending_approval' || e.status === 'payment_pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{e.status === 'pending_approval' ? 'Pending' : e.status === 'payment_pending' ? 'Complete payment' : e.status === 'on_hold' ? 'On hold' : e.status}</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{e.courses?.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{e.courses?.code} • NQF {e.courses?.nqf_level} • {e.courses?.credits} credits</p>
                {e.status === 'approved' && (
                  <p className="text-xs text-blue-600 font-medium">Access course →</p>
                )}
                {(e.status === 'pending_approval' || e.status === 'payment_pending') && (
                  <p className="text-xs text-blue-600 font-medium">View details &amp; upload proof of payment →</p>
                )}
                {e.status === 'on_hold' && (
                  <p className="text-xs text-amber-700 font-medium">Access on hold – view details →</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Available Programmes</h2>
        {available.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm">No other programmes available right now.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {available.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="w-10 h-10 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-sm font-bold mb-3">{c.code?.substring(0, 2)}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{c.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{c.code} • NQF {c.nqf_level} • {c.credits} credits</p>
                {c.description && <p className="text-xs text-gray-400 mb-4 line-clamp-2">{c.description}</p>}
                <Link href={`/student/enroll/${c.id}`} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors inline-block">
                  Apply now
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

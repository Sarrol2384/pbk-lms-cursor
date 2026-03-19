import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateShort } from '@/lib/utils'
import DeleteCourseButton from '@/components/admin/DeleteCourseButton'

export default async function AdminCoursesPage() {
  const supabase = createServiceClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, code, nqf_level, credits, saqa_id, status, created_at')
    .order('created_at', { ascending: false })

  const courseIds = courses?.map(c => c.id) ?? []
  const { data: moduleCounts } = courseIds.length > 0
    ? await supabase.from('modules').select('course_id').in('course_id', courseIds)
    : { data: [] }
  const { data: enrollmentCounts } = courseIds.length > 0
    ? await supabase.from('enrollments').select('course_id').eq('status', 'approved').in('course_id', courseIds)
    : { data: [] }

  const moduleMap: Record<string, number> = {}
  const enrollMap: Record<string, number> = {}
  moduleCounts?.forEach(m => { moduleMap[m.course_id] = (moduleMap[m.course_id] || 0) + 1 })
  enrollmentCounts?.forEach(e => { enrollMap[e.course_id] = (enrollMap[e.course_id] || 0) + 1 })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 text-sm mt-1">Manage SETA-accredited courses</p>
        </div>
        <Link href="/admin/courses/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New course
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!courses || courses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-medium text-gray-900 mb-1">No courses yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first SETA-accredited course to get started.</p>
            <Link href="/admin/courses/new" className="text-blue-600 text-sm font-medium hover:underline">Create a course →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Course', 'Code', 'NQF', 'Credits', 'Modules', 'Students', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.title}</p>
                    {c.saqa_id && <p className="text-xs text-gray-400">SAQA: {c.saqa_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.code}</td>
                  <td className="px-4 py-3 text-gray-600">{c.nqf_level}</td>
                  <td className="px-4 py-3 text-gray-600">{c.credits}</td>
                  <td className="px-4 py-3 text-gray-600">{moduleMap[c.id] || 0}</td>
                  <td className="px-4 py-3 text-gray-600">{enrollMap[c.id] || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.status === 'published' ? 'bg-green-100 text-green-700' :
                      c.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateShort(c.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/courses/${c.id}`} className="text-blue-600 hover:underline text-xs font-medium">Manage</Link>
                    <DeleteCourseButton courseId={c.id} courseTitle={c.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

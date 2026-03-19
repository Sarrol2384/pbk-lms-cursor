import { createServiceClient } from '@/lib/supabase/server'
import EnrollmentsTable from '@/components/admin/EnrollmentsTable'
import CleanupOrphansButton from '@/components/admin/CleanupOrphansButton'

export default async function AdminEnrollmentsPage() {
  const service = createServiceClient()

  // Use left-join style: don't filter out rows where user no longer exists
  const { data: rows } = await service
    .from('enrollments')
    .select('id, user_id, course_id, status, enrolled_at')
    .order('enrolled_at', { ascending: false })

  // Fetch profile/course names separately so orphan enrollments still appear
  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)))
  const courseIds = Array.from(new Set((rows ?? []).map((r) => r.course_id)))

  const { data: profiles } = userIds.length
    ? await service.from('profiles').select('id, first_name, last_name, email').in('id', userIds)
    : { data: [] }
  const { data: courses } = courseIds.length
    ? await service.from('courses').select('id, title, code').in('id', courseIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]))

  const enrollments = (rows ?? []).map((r) => {
    const p = profileMap.get(r.user_id)
    const c = courseMap.get(r.course_id)
    return {
      id: r.id,
      user_id: r.user_id,
      course_id: r.course_id,
      status: r.status,
      enrolled_at: r.enrolled_at,
      profiles: p ? { first_name: p.first_name, last_name: p.last_name, email: p.email } : null,
      courses: c ? { title: c.title, code: c.code } : null,
    }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
        <p className="text-gray-500 text-sm mt-1">
          All course enrollments. Remove an enrollment to allow removing that student from Users (e.g. old or mistaken enrollments).
        </p>
      </div>
      <CleanupOrphansButton />
      <EnrollmentsTable enrollments={enrollments} />
    </div>
  )
}

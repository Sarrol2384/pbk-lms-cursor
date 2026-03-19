import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CourseEditor from '@/components/admin/CourseEditor'
import ValidateCourseLinks from '@/components/admin/ValidateCourseLinks'

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const supabase = createClient()
  const { data: course } = await supabase.from('courses').select('*').eq('id', params.courseId).single()
  if (!course) notFound()

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, description, sequence, credits, pass_mark, units(id,title,sequence,video_url), assessments(id,title,type,total_marks,weight,due_date)')
    .eq('course_id', params.courseId)
    .order('sequence', { ascending: true })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.status === 'published' ? 'bg-green-100 text-green-700' : course.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
              {course.status}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{course.code} • NQF {course.nqf_level} • {course.credits} credits</p>
        </div>
      </div>
      <div className="mb-6">
        <ValidateCourseLinks courseId={params.courseId} />
      </div>
      <CourseEditor course={course} modules={(modules ?? []) as any} />
    </div>
  )
}

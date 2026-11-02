import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { UnitCompleteAtBottom } from '@/components/student/UnitCompleteAtBottom'
import { LessonContent } from '@/components/student/LessonContent'
import { assertPreviousModulePassed, requireActiveEnrollment } from '@/lib/enrollment-access'

export default async function StudentUnitPage({
  params,
}: { params: { courseId: string; moduleId: string; unitId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await requireActiveEnrollment(user.id, params.courseId)
  if (!access.ok) redirect(`/student/enroll/${params.courseId}`)

  const unlocked = await assertPreviousModulePassed(user.id, params.courseId, params.moduleId)
  if (!unlocked.ok) {
    if (unlocked.error === 'Module not found') notFound()
    redirect(`/student/courses/${params.courseId}?locked=1`)
  }

  const { data: unit } = await supabase
    .from('units')
    .select('id, title, sequence, content, video_url, resources')
    .eq('id', params.unitId)
    .eq('module_id', params.moduleId)
    .single()

  if (!unit) notFound()

  const { data: module } = await supabase
    .from('modules')
    .select('id, title, sequence')
    .eq('id', params.moduleId)
    .single()

  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', params.courseId)
    .single()

  const resources = Array.isArray(unit.resources) ? (unit.resources as { title?: string; url?: string; type?: string; author?: string; publisher?: string; year?: string }[]) : []

  return (
    <div className="w-full min-w-0 max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/student/courses/${params.courseId}`} className="text-blue-600 hover:underline">
          {course?.title}
        </Link>
        <span className="text-gray-400">/</span>
        <Link href={`/student/courses/${params.courseId}/modules/${params.moduleId}`} className="text-blue-600 hover:underline">
          {module?.title}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">{unit.title}</span>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs font-medium text-blue-600">Unit {unit.sequence}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">{unit.title}</h1>
          <p className="text-xs text-gray-500 mt-2">Scroll to the bottom of this unit to mark it complete. You don&apos;t need to open the suggested reading links.</p>
        </div>

        <div className="min-w-0 space-y-6 p-4 sm:p-5">
          {unit.video_url && (
            <div className="rounded-lg overflow-hidden bg-gray-900 aspect-video">
              <iframe
                src={unit.video_url}
                title={unit.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {unit.content && <LessonContent content={unit.content} />}

          {!unit.content && !unit.video_url && (
            <p className="text-gray-500 text-sm">No content available for this unit yet.</p>
          )}

          {resources.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Suggested reading</h3>
              <ul className="space-y-2">
                {resources.map((r, i) => {
                  const isBook = r.type === 'book'
                  const sub = [r.author, r.publisher, r.year].filter(Boolean).join(' · ')
                  return (
                    <li key={i} className="text-sm text-gray-700">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {r.title || 'Resource'}
                          {sub && <span className="text-gray-500 font-normal"> — {sub}</span>} ↗
                        </a>
                      ) : (
                        <span>
                          {isBook && <span className="text-gray-500 font-medium">Book: </span>}
                          {r.title || 'Resource'}
                          {sub && <span className="text-gray-500"> — {sub}</span>}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <UnitCompleteAtBottom unitId={params.unitId} />
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          href={`/student/courses/${params.courseId}/modules/${params.moduleId}`}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          ← Back to module
        </Link>
        <Link href={`/student/courses/${params.courseId}`} className="text-sm text-gray-500 hover:text-gray-700">
          Course overview
        </Link>
      </div>
    </div>
  )
}

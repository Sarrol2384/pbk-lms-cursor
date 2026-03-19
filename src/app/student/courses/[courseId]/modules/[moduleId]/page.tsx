import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StudentModulePage({
  params,
}: { params: { courseId: string; moduleId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', params.courseId)
    .eq('status', 'approved')
    .single()

  if (!enrollment) redirect(`/student/enroll/${params.courseId}`)

  const { data: module } = await supabase
    .from('modules')
    .select('id, title, description, sequence, credits, pass_mark')
    .eq('id', params.moduleId)
    .eq('course_id', params.courseId)
    .single()

  if (!module) notFound()

  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', params.courseId)
    .single()

  const { data: courseModules } = await supabase
    .from('modules')
    .select('id, sequence')
    .eq('course_id', params.courseId)
    .order('sequence', { ascending: true })
  const modList = courseModules ?? []
  const currentIdx = modList.findIndex((m: { id: string }) => m.id === params.moduleId)
  const previousModuleId = currentIdx > 0 ? modList[currentIdx - 1]?.id : null
  const { data: prevProgress } = previousModuleId
    ? await supabase.from('module_progress').select('status').eq('user_id', user.id).eq('module_id', previousModuleId).single()
    : { data: { status: 'passed' } }
  if (previousModuleId && prevProgress?.status !== 'passed') {
    redirect(`/student/courses/${params.courseId}?locked=1`)
  }

  const { data: units } = await supabase
    .from('units')
    .select('id, title, sequence')
    .eq('module_id', params.moduleId)
    .order('sequence', { ascending: true })

  const sortedUnits = (units ?? []).sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
  const unitIds = sortedUnits.map((u: { id: string }) => u.id)
  const { data: completions } = await supabase
    .from('unit_completions')
    .select('unit_id')
    .eq('user_id', user.id)
    .in('unit_id', unitIds)
  const completedUnitIds = new Set((completions ?? []).map((c: { unit_id: string }) => c.unit_id))
  const allUnitsComplete = unitIds.length > 0 && unitIds.every((id: string) => completedUnitIds.has(id))

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title, type, total_marks, weight')
    .eq('module_id', params.moduleId)
  const sortedAssessments = (assessments ?? []).sort((a: any, b: any) => (a.type === 'final_exam' ? 1 : 0) - (b.type === 'final_exam' ? 1 : 0))

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/student/courses/${params.courseId}`} className="text-blue-600 hover:underline">
          {course?.title}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">{module.title}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <p className="text-xs font-medium text-blue-600">Module {module.sequence}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">{module.title}</h1>
        {module.description && (
          <p className="text-sm text-gray-600 mt-2">{module.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">{module.credits ?? 0} credits • Pass: {module.pass_mark ?? 50}%</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Units</h2>
          <p className="text-xs text-gray-500 mt-0.5">Work through each unit in order</p>
        </div>
        <div className="divide-y divide-gray-100">
          {sortedUnits.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No units in this module yet.</div>
          ) : (
            sortedUnits.map((u: any, idx: number) => {
              const completed = completedUnitIds.has(u.id)
              return (
                <Link
                  key={u.id}
                  href={`/student/courses/${params.courseId}/modules/${params.moduleId}/units/${u.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                      {completed ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.title}</p>
                      <p className="text-xs text-gray-500">Unit {u.sequence}{completed ? ' • Done' : ''}</p>
                    </div>
                    <span className="ml-auto text-blue-600 text-sm font-medium">View →</span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {sortedAssessments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quizzes & assessments</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {allUnitsComplete
                ? 'Complete the assessments below to pass this module.'
                : 'Complete all units above to unlock assessments.'}
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {sortedAssessments.map((a: any) => (
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.type?.replace(/_/g, ' ')} • {a.total_marks} marks • Weight {a.weight}%</p>
                </div>
                {allUnitsComplete ? (
                  <Link
                    href={`/student/courses/${params.courseId}/modules/${params.moduleId}/assessments/${a.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Take →
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">Locked</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link
          href={`/student/courses/${params.courseId}`}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          ← Back to course
        </Link>
      </div>
    </div>
  )
}

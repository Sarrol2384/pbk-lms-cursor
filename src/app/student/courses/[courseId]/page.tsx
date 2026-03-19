import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { refreshProgressAndCertificate } from '@/lib/progress'
import { getPaymentDeadline } from '@/lib/utils'

export default async function StudentCoursePage({ params }: { params: { courseId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status, enrolled_at, created_at')
    .eq('user_id', user.id)
    .eq('course_id', params.courseId)
    .single()

  if (!enrollment || enrollment.status !== 'approved') {
    redirect(`/student/enroll/${params.courseId}`)
  }

  const service = createServiceClient()
  const { data: payments } = await service.from('payments').select('id, amount, amount_paid, created_at, total_installments').eq('enrollment_id', enrollment.id)
  const total = (payments ?? []).reduce((s: number, p: { amount?: number }) => s + (p.amount ?? 0), 0)
  const paid = (payments ?? []).reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid ?? 0), 0)
  const balance = total - paid
  const totalInstallments = Math.max(1, (payments?.[0] as { total_installments?: number })?.total_installments ?? 1)
  const startDate = (enrollment as { enrolled_at?: string }).enrolled_at ?? (payments?.[0] as { created_at?: string })?.created_at ?? (enrollment as { created_at?: string }).created_at
  const { isOverdue } = getPaymentDeadline(startDate, totalInstallments)

  if (balance > 0 && isOverdue) {
    await service.from('enrollments').update({ status: 'on_hold' }).eq('id', enrollment.id).eq('status', 'approved')
    redirect(`/student/enroll/${params.courseId}`)
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, code, nqf_level, credits, description')
    .eq('id', params.courseId)
    .eq('status', 'published')
    .single()

  if (!course) notFound()

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, description, sequence, credits, pass_mark, units(id, title, sequence)')
    .eq('course_id', params.courseId)
    .order('sequence', { ascending: true })

  const sortedModules = (modules ?? []).map((m: any) => ({
    ...m,
    units: (m.units ?? []).sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0)),
  }))

  const moduleIds = sortedModules.map((m: any) => m.id)
  await refreshProgressAndCertificate(user.id, params.courseId)
  const { data: progressRows } = await supabase
    .from('module_progress')
    .select('module_id, status')
    .eq('user_id', user.id)
    .in('module_id', moduleIds)
  const progressByModule: Record<string, 'in_progress' | 'passed'> = {}
  for (const r of progressRows ?? []) {
    progressByModule[r.module_id] = r.status as 'in_progress' | 'passed'
  }
  for (const id of moduleIds) {
    if (!progressByModule[id]) progressByModule[id] = 'in_progress'
  }
  const previousPassed = (idx: number) => idx === 0 || (progressByModule[sortedModules[idx - 1]?.id] === 'passed')
  const allPassed = moduleIds.length > 0 && moduleIds.every(id => progressByModule[id] === 'passed')
  const { data: cert } = allPassed ? await supabase.from('certificates').select('id').eq('user_id', user.id).eq('course_id', params.courseId).maybeSingle() : { data: null }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <p className="text-gray-500 text-sm mt-1">{course.code} • NQF {course.nqf_level} • {course.credits} credits</p>
      </div>

      {course.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">{course.description}</p>
        </div>
      )}

      {/* Certificate progress / eligibility */}
      {sortedModules.length > 0 && (
        <div className={`rounded-xl border p-5 mb-6 ${cert ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🏆</span>
            <div>
              <h3 className="font-semibold text-gray-900">
                {cert ? 'Your certificate is ready' : 'Certificate progress'}
              </h3>
              {cert ? (
                <p className="text-sm text-gray-700 mt-1">
                  You have passed all {sortedModules.length} module{sortedModules.length !== 1 ? 's' : ''}. Your certificate has been issued.
                </p>
              ) : (
                <p className="text-sm text-gray-700 mt-1">
                  {(() => {
                    const passedCount = moduleIds.filter(id => progressByModule[id] === 'passed').length
                    return (
                      <>
                        {passedCount} of {sortedModules.length} module{sortedModules.length !== 1 ? 's' : ''} passed.
                        Pass every module at its required pass mark to receive your certificate automatically.
                      </>
                    )
                  })()}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {cert ? (
                  <>
                    <a href={`/api/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-700 hover:text-green-800 underline">
                      View certificate
                    </a>
                    <a href={`/api/certificates/${cert.id}/pdf`} download className="text-sm font-medium text-green-700 hover:text-green-800 underline">
                      Download PDF
                    </a>
                    <Link href="/student/certificates" className="text-sm font-medium text-green-700 hover:text-green-800 underline">
                      All certificates
                    </Link>
                  </>
                ) : (
                  <Link href="/student/certificates" className="text-sm font-medium text-amber-800 hover:text-amber-900 underline">
                    How certificates work
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Course content</h2>
          <p className="text-xs text-gray-500 mt-0.5">Work through each module in order</p>
        </div>
        <div className="divide-y divide-gray-100">
          {sortedModules.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              <p>No modules published yet. Check back soon.</p>
            </div>
          ) : (
            sortedModules.map((mod: any, idx: number) => {
              const unlocked = previousPassed(idx)
              const status = progressByModule[mod.id]
              const passed = status === 'passed'
              return (
                <div key={mod.id} className="p-5">
                  {unlocked ? (
                    <Link href={`/student/courses/${params.courseId}/modules/${mod.id}`} className="block group">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-blue-600">Module {idx + 1}</p>
                          <h3 className="font-medium text-gray-900 mt-0.5 group-hover:text-blue-600">{mod.title}</h3>
                          {mod.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mod.description}</p>}
                          <p className="text-xs text-gray-400 mt-2">
                            {mod.credits ?? 0} credits • Pass: {mod.pass_mark ?? 50}%
                            {passed && <span className="text-green-600 ml-2">✓ Passed</span>}
                          </p>
                        </div>
                        <span className="text-blue-600 text-sm font-medium shrink-0">Open →</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="block opacity-75">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-400">Module {idx + 1}</p>
                          <h3 className="font-medium text-gray-500">{mod.title}</h3>
                          {mod.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{mod.description}</p>}
                          <p className="text-xs text-gray-400 mt-2">Complete and pass Module {idx} to unlock</p>
                        </div>
                        <span className="text-gray-400 text-sm shrink-0">Locked</span>
                      </div>
                    </div>
                  )}
                  {unlocked && (mod.units?.length ?? 0) > 0 && (
                    <ul className="mt-3 ml-4 space-y-1.5">
                      {(mod.units ?? []).map((u: any, uIdx: number) => (
                        <li key={u.id}>
                          <Link
                            href={`/student/courses/${params.courseId}/modules/${mod.id}/units/${u.id}`}
                            className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-2"
                          >
                            <span className="text-gray-400">{uIdx + 1}.</span>
                            {u.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link href="/student/courses" className="text-sm text-blue-600 hover:underline font-medium">
          ← Back to My Courses
        </Link>
        {cert && (
          <Link href="/student/certificates" className="text-sm text-green-600 hover:underline font-medium">
            View certificate →
          </Link>
        )}
      </div>
    </div>
  )
}

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { SubmitAssignmentForm } from './SubmitAssignmentForm'
import { TakeQuiz } from '@/components/student/TakeQuiz'

export default async function StudentAssessmentPage({
  params,
}: { params: { courseId: string; moduleId: string; assessmentId: string } }) {
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

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, type, total_marks, weight, brief')
    .eq('id', params.assessmentId)
    .eq('module_id', params.moduleId)
    .single()
  if (!assessment) notFound()

  const { data: module } = await supabase.from('modules').select('title').eq('id', params.moduleId).single()
  const { data: course } = await supabase.from('courses').select('title').eq('id', params.courseId).single()

  const isAssignment = assessment.type === 'assignment'
  const isQuiz = ['formative_quiz', 'module_test', 'final_exam'].includes(assessment.type)

  const { data: existing } = await supabase
    .from('submissions')
    .select('id, status, marks_obtained')
    .eq('user_id', user.id)
    .eq('assessment_id', params.assessmentId)
    .maybeSingle()

  // Load quiz questions and rubrics with service client so students see them (RLS only allows admin/lecturer by default)
  const service = createServiceClient()
  let quizQuestions: { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; marks: number }[] = []
  let rubrics: { criteria: string; marks: number }[] = []
  if (isQuiz) {
    const { data: qRows } = await service.from('quiz_questions').select('id, question, option_a, option_b, option_c, option_d, marks').eq('assessment_id', params.assessmentId).order('id')
    quizQuestions = (qRows ?? []).map(q => ({ id: q.id, question: q.question ?? '', option_a: q.option_a ?? '', option_b: q.option_b ?? '', option_c: q.option_c ?? '', option_d: q.option_d ?? '', marks: q.marks ?? 0 }))
  }
  if (isAssignment) {
    const { data: rRows } = await service.from('assignment_rubrics').select('criteria, marks').eq('assessment_id', params.assessmentId).order('id')
    rubrics = (rRows ?? []) as { criteria: string; marks: number }[]
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/student/courses/${params.courseId}`} className="text-blue-600 hover:underline">{course?.title}</Link>
        <span className="text-gray-400">/</span>
        <Link href={`/student/courses/${params.courseId}/modules/${params.moduleId}`} className="text-blue-600 hover:underline">{module?.title}</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">{assessment.title}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs font-medium text-blue-600">{assessment.type?.replace(/_/g, ' ')}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">{assessment.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{assessment.total_marks} marks • Weight {assessment.weight}%</p>

        {existing?.status === 'graded' && existing.marks_obtained != null && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">Graded: {existing.marks_obtained} / {assessment.total_marks}</p>
          </div>
        )}

        {isAssignment && (
          <>
            {assessment.brief && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Brief</h3>
                {assessment.brief.includes('<') ? (
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: assessment.brief }} />
                ) : (
                  <div className="text-gray-700 text-sm whitespace-pre-wrap">{assessment.brief}</div>
                )}
              </div>
            )}
            {rubrics.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Assessment criteria (rubric)</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-3 font-medium text-gray-700">Criterion</th>
                      <th className="text-right py-2 w-16 font-medium text-gray-700">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubrics.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-3 text-gray-700">{row.criteria}</td>
                        <td className="py-2 text-right text-gray-600">{row.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-2">Total: {rubrics.reduce((s, r) => s + (r.marks ?? 0), 0)} marks</p>
              </div>
            )}
            {existing?.status !== 'graded' && (
              <>
                <p className="mt-4 text-sm text-gray-600">
                  Submit your work directly here: upload your file (Word, PDF, or image) and click Submit. You do not leave the portal — everything is done on this page.
                </p>
                <SubmitAssignmentForm assessmentId={params.assessmentId} existingSubmissionId={existing?.id} />
              </>
            )}
          </>
        )}

        {isQuiz && (
          <>
            {existing?.status === 'graded' && existing.marks_obtained != null ? (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">Your score: {existing.marks_obtained} / {assessment.total_marks}</p>
              </div>
            ) : quizQuestions.length > 0 ? (
              <TakeQuiz questions={quizQuestions} totalMarks={assessment.total_marks ?? 0} assessmentId={params.assessmentId} />
            ) : (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">No questions in this quiz yet.</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6">
        <Link href={`/student/courses/${params.courseId}/modules/${params.moduleId}`} className="text-sm text-blue-600 hover:underline font-medium">← Back to module</Link>
      </div>
    </div>
  )
}

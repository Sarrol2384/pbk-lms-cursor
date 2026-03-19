import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AssessmentEditor from '@/components/admin/AssessmentEditor'

export default async function AssessmentDetailPage({
  params,
}: {
  params: { courseId: string; moduleId: string; assessmentId: string }
}) {
  const supabase = createClient()
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', params.assessmentId)
    .eq('module_id', params.moduleId)
    .single()

  if (!assessment) notFound()

  let questions: { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; marks: number }[] = []
  let rubrics: { id: string; criteria: string; marks: number }[] = []

  if (assessment.type === 'formative_quiz' || assessment.type === 'module_test' || assessment.type === 'final_exam') {
    const { data } = await supabase.from('quiz_questions').select('*').eq('assessment_id', params.assessmentId).order('id')
    questions = (data ?? []) as typeof questions
  } else if (assessment.type === 'assignment') {
    const { data } = await supabase.from('assignment_rubrics').select('*').eq('assessment_id', params.assessmentId).order('id')
    rubrics = (data ?? []) as typeof rubrics
  }

  const { data: module } = await supabase.from('modules').select('title').eq('id', params.moduleId).single()

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/admin/courses/${params.courseId}`} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
          <p className="text-gray-500 text-sm">{module?.title} • {assessment.type.replace(/_/g, ' ')} • {assessment.total_marks} marks</p>
        </div>
      </div>
      <AssessmentEditor assessment={assessment} questions={questions} rubrics={rubrics} courseId={params.courseId} />
    </div>
  )
}

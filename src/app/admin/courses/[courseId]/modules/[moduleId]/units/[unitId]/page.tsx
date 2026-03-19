import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UnitEditor from '@/components/admin/UnitEditor'

export default async function UnitDetailPage({
  params,
}: {
  params: { courseId: string; moduleId: string; unitId: string }
}) {
  const supabase = createClient()
  const { data: unit } = await supabase
    .from('units')
    .select('*')
    .eq('id', params.unitId)
    .eq('module_id', params.moduleId)
    .single()

  if (!unit) notFound()

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
          <h1 className="text-2xl font-bold text-gray-900">{unit.title}</h1>
          <p className="text-gray-500 text-sm">{module?.title} • Unit {unit.sequence}</p>
        </div>
      </div>
      <UnitEditor unit={unit} courseId={params.courseId} />
    </div>
  )
}

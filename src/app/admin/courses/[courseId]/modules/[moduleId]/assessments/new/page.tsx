'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TYPES = [
  { value: 'formative_quiz', label: 'Formative Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'module_test', label: 'Module Test' },
  { value: 'final_exam', label: 'Final Exam' },
]

export default function NewAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const moduleId = params.moduleId as string

  const [type, setType] = useState('formative_quiz')
  const [title, setTitle] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [weight, setWeight] = useState(20)
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('assessments').insert({
      module_id: moduleId,
      type,
      title: title.trim(),
      total_marks: totalMarks,
      weight,
      due_date: dueDate || null,
    })

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/admin/courses/${courseId}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Assessment</h1>
          <p className="text-gray-500 text-sm">Add a quiz, assignment, test or exam</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select value={type} onChange={e => setType(e.target.value)} className={`${inputClass} bg-white`}>
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Unit 1 Quiz" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total marks</label>
            <input type="number" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} min={1} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
            <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} min={0} max={100} className={inputClass} />
          </div>
        </div>
        {(type === 'assignment' || type === 'module_test' || type === 'final_exam') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Link href={`/admin/courses/${courseId}`} className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm">
            {loading ? 'Saving...' : 'Save assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}

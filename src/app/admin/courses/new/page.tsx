'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const BATCH_SIZE = 2
// For large full-content runs, 1 module per API call reduces JSON size and parse errors
const BATCH_SIZE_SAFE = 1
const MODULE_OPTS = [3, 6, 10, 12, 15, 18, 20]
const UNITS_OPTS = [3, 4, 5, 6]
const QUIZ_OPTS = [10, 15, 20]
const PASS_MARK_OPTS = [50, 60, 70, 80]

export default function NewCoursePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState<string | null>(null)
  const [aiSuccess, setAiSuccess] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [form, setForm] = useState({
    title: '', code: '', nqf_level: 4, credits: 120,
    saqa_id: '', description: '', status: 'draft' as 'draft' | 'published',
  })

  const [aiConfig, setAiConfig] = useState({
    numModules: 6,
    unitsPerModule: 5,
    quizQuestionsPerModule: 20,
    passMark: 70,
    generateFullContent: true,
    moduleNames: '',
  })

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function buildAutoDescription(title: string, nqfLevel: number, credits: number) {
    const safeTitle = title.trim() || 'This course'
    return `${safeTitle} is a SETA-aligned programme at NQF Level ${nqfLevel} (${credits} credits), designed for the South African context. It develops practical and academic competence through structured modules, formative quizzes, and applied assignments to support real workplace performance.`
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.code) { setError('Title and code are required'); return }
    setLoading(true); setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const description = form.description.trim() || buildAutoDescription(form.title, form.nqf_level, form.credits)
    const { data: course, error: err } = await supabase
      .from('courses')
      .insert({ ...form, saqa_id: form.saqa_id || null, description, created_by: user.id, expected_modules: 20 })
      .select('id').single()

    if (err) { setError(err.message); setLoading(false); return }

    await supabase.from('modules').insert({
      course_id: course.id, title: 'Module 1', description: null,
      sequence: 1, credits: Math.max(1, Math.floor(form.credits / 4)), pass_mark: 50,
    })

    router.push(`/admin/courses/${course.id}`)
  }

  async function generateWithAI() {
    if (!form.title || !form.code) { setError('Course title and code are required'); return }
    setAiLoading(true); setError(null); setAiSuccess(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAiLoading(false); return }

    let course: { id: string } | null = null

    // Try to find an existing course with this code first (from a previous failed run)
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('code', form.code)
      .single()

    if (existing) {
      course = existing
      setAiProgress('Found existing course — cleaning old generated content...')

      const description = form.description.trim() || buildAutoDescription(form.title, form.nqf_level, form.credits)
      const { error: updateErr } = await supabase
        .from('courses')
        .update({
          title: form.title,
          nqf_level: form.nqf_level,
          credits: form.credits,
          saqa_id: form.saqa_id || null,
          description,
          status: form.status,
          expected_modules: aiConfig.numModules,
        })
        .eq('id', existing.id)
      if (updateErr) { setError(`Failed to update existing course: ${updateErr.message}`); setAiLoading(false); setAiProgress(null); return }

      // Start fresh so stale partial data from previous failed runs is removed.
      const { error: wipeErr } = await supabase
        .from('modules')
        .delete()
        .eq('course_id', existing.id)
      if (wipeErr) { setError(`Failed to reset old modules: ${wipeErr.message}`); setAiLoading(false); setAiProgress(null); return }
    } else {
      const description = form.description.trim() || buildAutoDescription(form.title, form.nqf_level, form.credits)
      const { data: inserted, error: err } = await supabase
        .from('courses')
        .insert({ ...form, saqa_id: form.saqa_id || null, description, created_by: user.id, expected_modules: aiConfig.numModules })
        .select('id').single()
      if (err) { setError(err.message); setAiLoading(false); return }
      course = inserted
    }

    if (!course) { setError('Could not create or find the course.'); setAiLoading(false); return }

    const numModules = aiConfig.numModules
    // With full content, always 1 module per API call to avoid timeouts and huge JSON
    const useSafeBatch = !!aiConfig.generateFullContent
    const batchSize = useSafeBatch ? BATCH_SIZE_SAFE : BATCH_SIZE
    const totalBatches = Math.ceil(numModules / batchSize)
    const creditsPerModule = Math.max(1, Math.floor(form.credits / numModules))
    const moduleNamesLines = aiConfig.moduleNames.trim() ? aiConfig.moduleNames.trim().split('\n').map(s => s.trim()).filter(Boolean) : []

    const CLIENT_RETRIES = 2

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize + 1
      const end = Math.min(start + batchSize - 1, numModules)
      const batchModuleNames = moduleNamesLines.length >= end ? moduleNamesLines.slice(start - 1, end) : []

      let batchModules: unknown[] | null = null
      let batchError = ''

      for (let attempt = 1; attempt <= CLIENT_RETRIES + 1; attempt++) {
        const attemptLabel = attempt > 1 ? ` (retry ${attempt - 1}/${CLIENT_RETRIES})` : ''
        setAiProgress(`Generating module ${start} of ${numModules}...${attemptLabel}`)

        const res = await fetch('/api/ai/generate-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseTitle: form.title,
            nqfLevel: form.nqf_level,
            credits: form.credits,
            description: form.description,
            batchIndex,
            batchSize,
            unitsPerModule: aiConfig.unitsPerModule,
            quizQuestionsPerModule: aiConfig.quizQuestionsPerModule,
            passMark: aiConfig.passMark,
            generateFullContent: aiConfig.generateFullContent,
            moduleNames: batchModuleNames,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          batchError = data.error || 'AI generation failed'
          continue // retry
        }

        if (!Array.isArray(data.modules)) {
          batchError = 'No modules in response'
          continue // retry
        }

        batchModules = data.modules
        break // success
      }

      if (!batchModules) {
        setError(`Failed after ${CLIENT_RETRIES + 1} attempts for module ${start}: ${batchError}`)
        setAiLoading(false)
        setAiProgress(null)
        return
      }

      for (let idx = 0; idx < batchModules.length; idx++) {
        const mod = batchModules[idx] as {
          title: string; description?: string | null; credits?: number; pass_mark?: number;
          units?: Array<Record<string, unknown>>;
          quiz?: { title?: string; questions?: unknown[]; total_marks?: number; weight?: number };
          assignment?: { title?: string; total_marks?: number; weight?: number; brief?: string | null; rubric?: Array<{ criteria?: string; marks?: number }> };
        }
        const globalSequence = start + idx
        const { data: savedModule } = await supabase
          .from('modules')
          .insert({
            course_id: course.id,
            title: mod.title,
            description: mod.description || null,
            sequence: globalSequence,
            credits: mod.credits ?? creditsPerModule,
            pass_mark: mod.pass_mark ?? aiConfig.passMark,
          })
          .select('id').single()

        if (!savedModule) continue

        for (const unit of mod.units ?? []) {
          const content = unit.content || ''
          const summary = unit.summary ? `\n\n## Summary\n${unit.summary}` : ''
          const concepts = Array.isArray(unit.key_concepts) && unit.key_concepts.length
            ? `\n\n## Key concepts\n${unit.key_concepts.map((c: string) => `- ${c}`).join('\n')}`
            : ''
          const resources = Array.isArray(unit.resources) ? unit.resources : []
          await supabase.from('units').insert({
            module_id: savedModule.id,
            title: unit.title,
            content: (content + summary + concepts).trim() || null,
            sequence: unit.sequence ?? 1,
            resources,
          })
        }

        if (mod.quiz?.title && Array.isArray(mod.quiz?.questions)) {
          const { data: quizAssessment, error: quizAssessErr } = await supabase
            .from('assessments')
            .insert({
              module_id: savedModule.id,
              title: mod.quiz.title,
              type: 'formative_quiz',
              total_marks: mod.quiz.total_marks ?? 100,
              weight: mod.quiz.weight ?? 10,
            })
            .select('id').single()
          if (quizAssessErr) {
            setError(`Failed to create quiz: ${quizAssessErr.message}`)
            setAiLoading(false)
            setAiProgress(null)
            return
          }
          if (quizAssessment) {
            for (let i = 0; i < mod.quiz.questions.length; i++) {
              const q = mod.quiz.questions[i]
              const row = (q as Record<string, unknown>)
              const questionText = (row.question ?? row.question_text ?? '') as string
              const optionA = (row.option_a ?? row.optionA ?? '') as string
              const optionB = (row.option_b ?? row.optionB ?? '') as string
              const optionC = (row.option_c ?? row.optionC ?? '') as string
              const optionD = (row.option_d ?? row.optionD ?? '') as string
              const correct = (row.correct_answer ?? row.correctAnswer ?? 'A') as string
              const marksVal = (row.marks ?? 5) as number
              const { error: qErr } = await supabase.from('quiz_questions').insert({
                assessment_id: quizAssessment.id,
                sequence: i + 1,
                question: questionText || '',
                option_a: optionA ?? '',
                option_b: optionB ?? '',
                option_c: optionC ?? '',
                option_d: optionD ?? '',
                correct_answer: ['A', 'B', 'C', 'D'].includes(correct) ? correct : 'A',
                marks: marksVal ?? 5,
              })
              if (qErr) {
                setError(`Failed to save quiz question: ${qErr.message}`)
                setAiLoading(false)
                setAiProgress(null)
                return
              }
            }
          }
        }

        if (mod.assignment?.title) {
          const { data: assignAssessment } = await supabase
            .from('assessments')
            .insert({
              module_id: savedModule.id,
              title: mod.assignment.title,
              type: 'assignment',
              total_marks: mod.assignment.total_marks ?? 100,
              weight: mod.assignment.weight ?? 20,
              brief: mod.assignment.brief || null,
            })
            .select('id').single()
          if (assignAssessment && Array.isArray(mod.assignment.rubric)) {
            for (const r of mod.assignment.rubric) {
              if (r.criteria) {
                await supabase.from('assignment_rubrics').insert({
                  assessment_id: assignAssessment.id,
                  criteria: r.criteria,
                  marks: r.marks ?? 20,
                })
              }
            }
          }
        }
      }
    }

    setAiProgress(null)
    setAiSuccess(true)
    setAiLoading(false)
    setTimeout(() => router.push(`/admin/courses/${course.id}`), 1500)
  }

  const fieldClass = (err?: boolean) => cn(
    'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
    err ? 'border-red-300' : 'border-gray-300'
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Course</h1>
          <p className="text-gray-500 text-sm">Create a SETA-accredited course</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {aiSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Course generated successfully! Redirecting...
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} className={fieldClass()} placeholder="e.g. Bachelor of Business Administration" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course code *</label>
            <input value={form.code} onChange={e => set('code', e.target.value)} className={fieldClass()} placeholder="e.g. BBA101" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SAQA ID</label>
            <input value={form.saqa_id} onChange={e => set('saqa_id', e.target.value)} className={fieldClass()} placeholder="e.g. 118402" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NQF Level *</label>
            <select value={form.nqf_level} onChange={e => set('nqf_level', Number(e.target.value))} className={cn(fieldClass(), 'bg-white')}>
              {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits *</label>
            <input type="number" value={form.credits} onChange={e => set('credits', Number(e.target.value))} min={1} className={fieldClass()} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={cn(fieldClass(), 'resize-none')} placeholder="Brief course overview... (leave blank to auto-generate)" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={cn(fieldClass(), 'bg-white')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* AI Generator Panel */}
        <div className="border border-purple-200 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setShowAiPanel(!showAiPanel)}
            className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors text-left">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <p className="text-sm font-semibold text-purple-900">Generate complete course with AI</p>
                <p className="text-xs text-purple-600">Full content: units (1000+ words), quiz questions, assignments (briefs & rubrics)</p>
              </div>
            </div>
            <svg className={cn('w-4 h-4 text-purple-400 transition-transform', showAiPanel ? 'rotate-180' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAiPanel && (
            <div className="p-4 bg-white border-t border-purple-100 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Number of modules</label>
                  <select value={aiConfig.numModules} onChange={e => setAiConfig(c => ({ ...c, numModules: Number(e.target.value) }))} className={cn(fieldClass(), 'bg-white')}>
                    {MODULE_OPTS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Units per module</label>
                  <select value={aiConfig.unitsPerModule} onChange={e => setAiConfig(c => ({ ...c, unitsPerModule: Number(e.target.value) }))} className={cn(fieldClass(), 'bg-white')}>
                    {UNITS_OPTS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quiz questions per module</label>
                  <select value={aiConfig.quizQuestionsPerModule} onChange={e => setAiConfig(c => ({ ...c, quizQuestionsPerModule: Number(e.target.value) }))} className={cn(fieldClass(), 'bg-white')}>
                    {QUIZ_OPTS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pass mark %</label>
                  <select value={aiConfig.passMark} onChange={e => setAiConfig(c => ({ ...c, passMark: Number(e.target.value) }))} className={cn(fieldClass(), 'bg-white')}>
                    {PASS_MARK_OPTS.map(n => <option key={n} value={n}>{n}%</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aiConfig.generateFullContent} onChange={e => setAiConfig(c => ({ ...c, generateFullContent: e.target.checked }))} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Generate full content (1000+ words per unit, quiz questions, assignments with briefs & rubrics)</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Module names (optional, one per line)</label>
                <textarea value={aiConfig.moduleNames} onChange={e => setAiConfig(c => ({ ...c, moduleNames: e.target.value }))} rows={4} className={cn(fieldClass(), 'resize-none')} placeholder="e.g. Year 1: Introduction to Management&#10;Year 1: Business Communication&#10;..." />
              </div>
              {aiProgress && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800 flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {aiProgress}
                </div>
              )}
              <button type="button" onClick={generateWithAI} disabled={aiLoading || !form.title || !form.code}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                {aiLoading ? (
                  <>Generating...</>
                ) : (
                  <>✨ Generate full course with AI</>
                )}
              </button>
              {aiLoading && (
                <p className="text-xs text-gray-400 text-center">Large courses (e.g. 20 modules) take several minutes. Do not close this page.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/admin/courses" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</Link>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
            {loading ? 'Creating...' : 'Create course (manual)'}
          </button>
        </div>
      </form>
    </div>
  )
}

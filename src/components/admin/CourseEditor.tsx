'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import ValidateCourseLinks from '@/components/admin/ValidateCourseLinks'

const MAX_MODULES = 24

type Unit = { id: string; title: string; sequence: number; video_url: string | null }
type Assessment = { id: string; title: string; type: string; total_marks: number; weight: number; due_date: string | null }
type Module = { id: string; title: string; description: string | null; sequence: number; credits: number; pass_mark: number; units: Unit[]; assessments: Assessment[] }
type Course = { id: string; title: string; code: string; nqf_level: number; credits: number; status: string; description: string | null; saqa_id: string | null; fee: number | null; duration_months: number | null; expected_modules?: number | null }

export default function CourseEditor({ course, modules }: { course: Course; modules: Module[] }) {
  const router = useRouter()
  const expectedModules = modules.length === 18 ? 18 : (course.expected_modules ?? 20)
  const [activeTab, setActiveTab] = useState<'modules' | 'settings'>('modules')
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDesc, setModuleDesc] = useState('')
  const [moduleCredits, setModuleCredits] = useState(10)
  const [saving, setSaving] = useState(false)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [fee, setFee] = useState<string>(course.fee != null ? String(course.fee) : '')
  const [durationMonths, setDurationMonths] = useState<string>(course.duration_months != null ? String(course.duration_months) : '12')
  const [expectedModulesSetting, setExpectedModulesSetting] = useState<number>(course.expected_modules ?? 20)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState<string | null>(null)
  const [aiNumModules, setAiNumModules] = useState(2)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiModuleList, setAiModuleList] = useState('')
  const [reorderLoading, setReorderLoading] = useState(false)
  const [regeneratingModuleId, setRegeneratingModuleId] = useState<string | null>(null)

  useEffect(() => {
    setFee(course.fee != null ? String(course.fee) : '')
    setDurationMonths(course.duration_months != null ? String(course.duration_months) : '12')
    setExpectedModulesSetting(course.expected_modules ?? 20)
  }, [course.fee, course.duration_months, course.expected_modules])

  async function addModule() {
    if (!moduleTitle.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('modules').insert({
      course_id: course.id, title: moduleTitle,
      description: moduleDesc || null, credits: moduleCredits,
      sequence: modules.length + 1, pass_mark: 50,
    })
    setModuleTitle(''); setModuleDesc(''); setModuleCredits(10)
    setShowModuleForm(false); setSaving(false)
    router.refresh()
  }

  async function deleteModule(moduleId: string) {
    setDeletingId(moduleId)
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error || 'Could not delete module.')
      } else {
        await reorderModules()
        router.refresh()
      }
    } catch {
      alert('Could not delete module.')
    } finally {
      setDeletingId(null)
      setDeleteConfirmId(null)
    }
  }

  async function reorderModules() {
    setReorderLoading(true)
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/reorder-modules`, { method: 'POST' })
      if (res.ok) router.refresh()
    } finally {
      setReorderLoading(false)
    }
  }

  async function regenerateModuleAssessments(moduleId: string) {
    setRegeneratingModuleId(moduleId)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/regenerate-module-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error || 'Regeneration failed'
        setAiError(msg)
        alert(msg)
        return
      }
      router.refresh()
    } catch {
      const msg = 'Regeneration failed'
      setAiError(msg)
      alert(msg)
    } finally {
      setRegeneratingModuleId(null)
    }
  }

  async function updateCourseStatus(status: string) {
    const supabase = createClient()
    await supabase.from('courses').update({ status }).eq('id', course.id)
    router.refresh()
  }

  async function saveFeeAndDuration() {
    const supabase = createClient()
    const feeNum = fee.trim() === '' ? null : Math.max(0, Number(fee))
    const durationNum = durationMonths.trim() === '' ? 12 : Math.max(1, Math.min(24, Number(durationMonths) || 12))
    await supabase.from('courses').update({ fee: feeNum, duration_months: durationNum }).eq('id', course.id)
    router.refresh()
  }

  async function saveExpectedModules() {
    const supabase = createClient()
    await supabase.from('courses').update({ expected_modules: expectedModulesSetting }).eq('id', course.id)
    router.refresh()
  }

  async function generateModulesWithAI() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setAiError('App not configured')
      return
    }
    setAiLoading(true)
    setAiError(null)
    setAiProgress('Starting...')
    const supabase = createClient()
    const parsedList: { name: string; credits?: number; year?: string }[] = aiModuleList
      .trim()
      .split(/\n/)
      .map(line => {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean)
        const name = parts[0] ?? ''
        const credits = parts[1] ? parseInt(parts[1], 10) : undefined
        const year = parts[2] ?? undefined
        return { name, credits: Number.isNaN(credits) ? undefined : credits, year }
      })
      .filter(p => p.name.length > 0)

    const existingTitlesBase = modules.map(m => m.title)
    const targetModules = aiNumModules >= 1000 ? aiNumModules - 1000 : null
    const maxToAdd = targetModules != null ? Math.max(0, targetModules - modules.length) : MAX_MODULES - modules.length
    const listToUse = parsedList.length > 0
      ? parsedList.filter(p => !existingTitlesBase.includes(p.name)).slice(0, maxToAdd)
      : null
    const actualNumToAdd = listToUse && listToUse.length > 0
      ? Math.min(listToUse.length, maxToAdd)
      : Math.min(maxToAdd, targetModules != null ? maxToAdd : Math.max(1, aiNumModules))

    if (actualNumToAdd <= 0) {
      setAiError('Already at target. No modules to add.')
      setAiLoading(false)
      setAiProgress(null)
      return
    }
    const creditsPerModule = Math.max(1, Math.floor((course.credits ?? 120) / (modules.length + actualNumToAdd)))
    let inserted = 0
    const insertedTitles: string[] = []
    if (listToUse && listToUse.length === 0) {
      setAiError('All pasted module names already exist in the course.')
      setAiLoading(false)
      setAiProgress(null)
      return
    }

    for (let i = 0; i < actualNumToAdd; i++) {
      setAiProgress(`Generating module ${modules.length + inserted + 1}...`)
      const existingTitles = [...modules.map(m => m.title), ...insertedTitles]
      const item = listToUse?.[i]
      const payload = {
        courseTitle: course.title,
        nqfLevel: course.nqf_level,
        credits: course.credits,
        description: course.description || '',
        existingModuleCount: modules.length + inserted,
        existingModuleTitles: existingTitles,
        batchIndex: 0,
        batchSize: 1,
        unitsPerModule: modules[0]?.units?.length ?? 5,
        quizQuestionsPerModule: 20,
        passMark: 70,
        generateFullContent: true,
        ...(item && {
          moduleNames: [item.name],
          moduleCredits: item.credits,
          moduleYear: item.year,
        }),
      }
      const res = await fetch('/api/ai/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'AI generation failed')
        setAiLoading(false)
        setAiProgress(null)
        return
      }
      if (!Array.isArray(data.modules) || data.modules.length === 0) {
        setAiError('No modules in response')
        setAiLoading(false)
        setAiProgress(null)
        return
      }

      const mod = data.modules[0]
      insertedTitles.push(mod.title ?? '')
      const globalSequence = modules.length + inserted + 1
      const useCredits = item?.credits ?? mod.credits ?? creditsPerModule
      const { data: savedModule, error: modErr } = await supabase
        .from('modules')
        .insert({
          course_id: course.id,
          title: mod.title,
          description: mod.description || null,
          sequence: globalSequence,
          credits: useCredits,
          pass_mark: mod.pass_mark ?? 70,
        })
        .select('id').single()

      if (modErr || !savedModule) {
        setAiError(`Failed to save module: ${modErr?.message || 'unknown'}`)
        setAiLoading(false)
        setAiProgress(null)
        return
      }

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
        const { data: quizAssessment } = await supabase
          .from('assessments')
          .insert({
            module_id: savedModule.id,
            title: mod.quiz.title,
            type: 'formative_quiz',
            total_marks: mod.quiz.total_marks ?? 100,
            weight: mod.quiz.weight ?? 10,
          })
          .select('id').single()
        if (quizAssessment) {
          for (let qi = 0; qi < mod.quiz.questions.length; qi++) {
            const q = mod.quiz.questions[qi] as Record<string, unknown>
            await supabase.from('quiz_questions').insert({
              assessment_id: quizAssessment.id,
              sequence: qi + 1,
              question: (q.question ?? '') as string,
              option_a: (q.option_a ?? '') as string,
              option_b: (q.option_b ?? '') as string,
              option_c: (q.option_c ?? '') as string,
              option_d: (q.option_d ?? '') as string,
              correct_answer: ['A', 'B', 'C', 'D'].includes((q.correct_answer as string) ?? '') ? (q.correct_answer as string) : 'A',
              marks: (q.marks ?? 5) as number,
            })
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

      inserted++
    }

    setAiProgress(null)
    setAiLoading(false)
    await fetch(`/api/admin/courses/${course.id}/reorder-modules`, { method: 'POST' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['modules', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'modules' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <p className="text-sm font-medium text-gray-700">
              Modules: <span className={modules.length === expectedModules ? 'text-green-600' : 'text-amber-600'}>{modules.length}</span>
              <span className="text-gray-500 font-normal"> / {expectedModules}</span>
            </p>
            {modules.length !== expectedModules && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                {modules.length < expectedModules
                  ? `Add ${expectedModules - modules.length} more unique module(s) to meet the ${expectedModules}-module standard.`
                  : `You have ${modules.length - expectedModules} extra module(s). Remove duplicates or keep if your SETA allows.`}
              </p>
            )}
            <button type="button" onClick={reorderModules} disabled={reorderLoading} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
              {reorderLoading ? 'Renumbering...' : 'Renumber modules (1, 2, 3...)'}
            </button>
          </div>

          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <button type="button" onClick={() => setShowAiPanel(!showAiPanel)} className="flex items-center gap-2 text-sm font-semibold text-purple-900">
              {showAiPanel ? '▼' : '▶'} Add new modules with AI
            </button>
            {showAiPanel && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-purple-700">
                  Generate modules (with units, quizzes, and assignments) using AI. Requires ANTHROPIC_API_KEY in .env. Each module is created one at a time.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paste module names (optional — AI will use these exact titles)</label>
                  <textarea
                    value={aiModuleList}
                    onChange={e => setAiModuleList(e.target.value)}
                    placeholder={"One per line. Optional: Name | credits | Year\n e.g.\nBusiness Administration 101 | 20 | Year 1\nBusiness Process Management 101 | 20 | Year 1"}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">If provided, AI generates these modules in order with the given credits and year (Year 1/2/3). Leave blank to let AI suggest new topics.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-gray-700">
                    Number to generate:
                    <select value={aiNumModules} onChange={e => setAiNumModules(Number(e.target.value))} className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm">
                      {[2, 4, 6, 10, 18].filter(n => n <= expectedModules).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                      {modules.length < expectedModules && <option value={1000 + expectedModules}>Up to {expectedModules} total</option>}
                    </select>
                  </label>
                  <button type="button" onClick={generateModulesWithAI} disabled={aiLoading || modules.length >= MAX_MODULES}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg">
                    {aiLoading ? (aiProgress || 'Generating...') : 'Generate with AI'}
                  </button>
                </div>
                {aiError && <p className="text-sm text-red-600">{aiError}</p>}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-1">
            Each module should have a unique title (e.g. Module 1: HRM, Module 2: Marketing). Duplicate or mistaken modules can be removed: expand the module and click &quot;Remove module&quot;.
          </p>
          {modules.map(mod => (
            <div key={mod.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{mod.sequence}</div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{mod.title}</p>
                    <p className="text-xs text-gray-500">{mod.credits} credits • Pass: {mod.pass_mark}% • {mod.units.length} unit{mod.units.length !== 1 ? 's' : ''} • {mod.assessments.length} assessment{mod.assessments.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <svg className={cn('w-4 h-4 text-gray-400 transition-transform', expandedModule === mod.id ? 'rotate-180' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedModule === mod.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Units</h4>
                      {mod.units.length === 0 ? <p className="text-xs text-gray-400">No units yet.</p> : (
                        <div className="space-y-1">
                          {mod.units.map(u => (
                            <Link key={u.id} href={`/admin/courses/${course.id}/modules/${mod.id}/units/${u.id}`}
                              className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 hover:bg-white rounded px-2 py-1 -mx-2 transition-colors">
                              <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-xs shrink-0">{u.sequence}</span>
                              {u.title} {u.video_url && <span className="text-blue-500">▶</span>}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assessments</h4>
                      {mod.assessments.length === 0 ? <p className="text-xs text-gray-400">No assessments yet.</p> : (
                        <div className="space-y-1">
                          {mod.assessments.map(a => (
                            <Link key={a.id} href={`/admin/courses/${course.id}/modules/${mod.id}/assessments/${a.id}`}
                              className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 hover:bg-white rounded px-2 py-1 -mx-2 transition-colors">
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize shrink-0">{a.type.replace(/_/g, ' ')}</span>
                              {a.title} — {a.total_marks} marks
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <ValidateCourseLinks courseId={course.id} moduleId={mod.id} moduleTitle={mod.title} compact />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => regenerateModuleAssessments(mod.id)}
                      disabled={regeneratingModuleId !== null}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 disabled:opacity-50 px-3 py-1.5 rounded-lg inline-block"
                      title="Generate or replace quiz and assignment for this module with AI (keeps units unchanged)"
                    >
                      {regeneratingModuleId === mod.id ? 'Regenerating...' : 'Regenerate quizzes & assignment'}
                    </button>
                    <Link href={`/admin/courses/${course.id}/modules/${mod.id}/units/new`}
                      className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg inline-block">+ Add unit</Link>
                    <Link href={`/admin/courses/${course.id}/modules/${mod.id}/assessments/new`}
                      className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg inline-block">+ Add assessment</Link>
                    {deleteConfirmId === mod.id ? (
                      <span className="text-xs text-amber-700 flex items-center gap-2">
                        Remove this module?{' '}
                        <button type="button" onClick={() => deleteModule(mod.id)} disabled={deletingId !== null}
                          className="text-red-600 hover:underline font-medium">Yes, remove</button>
                        <button type="button" onClick={() => setDeleteConfirmId(null)} className="text-gray-600 hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirmId(mod.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">
                        Remove module
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {showModuleForm ? (
            <div className="bg-white rounded-xl border border-blue-300 p-4 space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Add module</h3>
              <input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} placeholder="Module title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={moduleDesc} onChange={e => setModuleDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Credits</label>
                <input type="number" value={moduleCredits} onChange={e => setModuleCredits(Number(e.target.value))} min={1}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowModuleForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addModule} disabled={saving || !moduleTitle.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg">
                  {saving ? 'Saving...' : 'Save module'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowModuleForm(true)}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add module
            </button>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Course fee (R)</label>
            <p className="text-xs text-gray-500 mb-2">Set the total fee in South African Rand. Students see this when applying and can pay in 1, 3, 6, or 12 instalments.</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                step={1}
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="e.g. 15000"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">R</span>
              <button onClick={saveFeeAndDuration} className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Save fee & duration</button>
            </div>
            {course.fee != null && course.fee > 0 && <p className="text-xs text-green-600 mt-1">Current fee: R{course.fee.toLocaleString()}</p>}
          </div>
          <div className="border-b border-gray-100 pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected modules</label>
            <p className="text-xs text-gray-500 mb-2">Target module count for this qualification (e.g. 18 for SAQA 118402 BBA, 20 for SETA-aligned full qualification).</p>
            <div className="flex gap-2 items-center">
              <select
                value={expectedModulesSetting}
                onChange={e => setExpectedModulesSetting(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={18}>18</option>
                <option value={20}>20</option>
              </select>
              <button onClick={saveExpectedModules} className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Save</button>
            </div>
          </div>
          <div className="border-b border-gray-100 pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment duration (months)</label>
            <p className="text-xs text-gray-500 mb-2">Max instalment plan (e.g. 12 = allow up to 12 monthly payments).</p>
            <input
              type="number"
              min={1}
              max={24}
              value={durationMonths}
              onChange={e => setDurationMonths(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 ml-2">months</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-500">{course.description || 'No description set.'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">SAQA ID</p>
            <p className="text-sm text-gray-500">{course.saqa_id || 'Not set'}</p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Publication status</p>
            <div className="flex gap-2">
              {['draft', 'published', 'archived'].map(s => (
                <button key={s} onClick={() => updateCourseStatus(s)}
                  className={cn('px-3 py-1.5 text-xs rounded-lg capitalize border transition-colors',
                    course.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

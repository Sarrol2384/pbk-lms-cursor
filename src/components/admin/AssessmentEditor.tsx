'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Assessment = { id: string; module_id: string; type: string; title: string; total_marks: number; weight: number; due_date: string | null; brief?: string | null }
type QuizQuestion = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; marks: number }
type RubricRow = { id: string; criteria: string; marks: number }

export default function AssessmentEditor({
  assessment,
  questions,
  rubrics,
  courseId,
}: {
  assessment: Assessment
  questions: QuizQuestion[]
  rubrics: RubricRow[]
  courseId: string
}) {
  const router = useRouter()
  const isQuiz = ['formative_quiz', 'module_test', 'final_exam'].includes(assessment.type)
  const isAssignment = assessment.type === 'assignment'

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(questions)
  const [newQ, setNewQ] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', marks: 10 })
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Assignment state
  const [brief, setBrief] = useState((assessment as { brief?: string }).brief ?? '')
  const [rubricRows, setRubricRows] = useState<{ criteria: string; marks: number }[]>(rubrics.length ? rubrics.map(r => ({ criteria: r.criteria, marks: r.marks })) : [{ criteria: '', marks: 0 }])
  const [savingAssign, setSavingAssign] = useState(false)

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function addQuizQuestion() {
    if (!newQ.question.trim()) return
    setSavingQuiz(true)
    const supabase = createClient()
    const nextSequence = quizQuestions.length + 1
    const { data, error } = await supabase.from('quiz_questions').insert({
      assessment_id: assessment.id,
      sequence: nextSequence,
      question: newQ.question.trim(),
      option_a: newQ.option_a.trim() || 'Option A',
      option_b: newQ.option_b.trim() || 'Option B',
      option_c: newQ.option_c.trim() || 'Option C',
      option_d: newQ.option_d.trim() || 'Option D',
      correct_answer: newQ.correct_answer,
      marks: newQ.marks,
    }).select('id, question, option_a, option_b, option_c, option_d, correct_answer, marks').single()
    if (!error && data) {
      setQuizQuestions(q => [...q, data as QuizQuestion])
      setNewQ({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', marks: 10 })
    }
    setSavingQuiz(false)
    router.refresh()
  }

  async function deleteQuizQuestion(questionId: string) {
    const supabase = createClient()
    await supabase.from('quiz_questions').delete().eq('id', questionId)
    setQuizQuestions(q => q.filter(x => x.id !== questionId))
    router.refresh()
  }

  function addRubricRow() {
    setRubricRows(r => [...r, { criteria: '', marks: 0 }])
  }

  function updateRubricRow(i: number, field: 'criteria' | 'marks', value: string | number) {
    setRubricRows(r => r.map((row, j) => j === i ? { ...row, [field]: value } : row))
  }

  async function saveAssignment() {
    setSavingAssign(true)
    const supabase = createClient()
    await supabase.from('assessments').update({ brief: brief.trim() || null }).eq('id', assessment.id)
    await supabase.from('assignment_rubrics').delete().eq('assessment_id', assessment.id)
    for (const row of rubricRows) {
      if (row.criteria.trim()) {
        await supabase.from('assignment_rubrics').insert({ assessment_id: assessment.id, criteria: row.criteria, marks: row.marks })
      }
    }
    setSavingAssign(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Details</h2>
        <p className="text-sm text-gray-500">{assessment.title} • {assessment.total_marks} marks • Weight: {assessment.weight}%{assessment.due_date ? ` • Due: ${assessment.due_date}` : ''}</p>
      </div>

      {isQuiz && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Questions</h2>
          {quizQuestions.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">No questions yet. Add one below.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {quizQuestions.map((q, i) => {
                const correctKey = q.correct_answer as 'A' | 'B' | 'C' | 'D'
                const correctOption = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[correctKey] ?? ''
                return (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">Q{i + 1}: {q.question}</p>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-gray-500">A: {q.option_a}</p>
                          <p className="text-gray-500">B: {q.option_b}</p>
                          <p className="text-gray-500">C: {q.option_c}</p>
                          <p className="text-gray-500">D: {q.option_d}</p>
                        </div>
                        <p className="text-xs font-medium text-green-700 mt-2 bg-green-50 border border-green-200 rounded px-2 py-1 inline-block">
                          ✓ Correct: {q.correct_answer} — {correctOption || '(see above)'} • {q.marks} marks
                        </p>
                      </div>
                      <button type="button" onClick={() => deleteQuizQuestion(q.id)} className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-2">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Add question</p>
            <div className="space-y-2">
              <input value={newQ.question} onChange={e => setNewQ(x => ({ ...x, question: e.target.value }))} className={inputClass} placeholder="Question text" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newQ.option_a} onChange={e => setNewQ(x => ({ ...x, option_a: e.target.value }))} className={inputClass} placeholder="Option A" />
                <input value={newQ.option_b} onChange={e => setNewQ(x => ({ ...x, option_b: e.target.value }))} className={inputClass} placeholder="Option B" />
                <input value={newQ.option_c} onChange={e => setNewQ(x => ({ ...x, option_c: e.target.value }))} className={inputClass} placeholder="Option C" />
                <input value={newQ.option_d} onChange={e => setNewQ(x => ({ ...x, option_d: e.target.value }))} className={inputClass} placeholder="Option D" />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-gray-600">Correct:</label>
                <select value={newQ.correct_answer} onChange={e => setNewQ(x => ({ ...x, correct_answer: e.target.value }))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm">
                  {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <label className="text-xs text-gray-600">Marks:</label>
                <input type="number" value={newQ.marks} onChange={e => setNewQ(x => ({ ...x, marks: Number(e.target.value) }))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm" min={1} />
                <button type="button" onClick={addQuizQuestion} disabled={savingQuiz} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">Add question</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAssignment && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Assignment brief</h2>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={8} className={`${inputClass} resize-y`} placeholder="Instructions and brief for students..." />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-900">Rubric</h2>
              <button type="button" onClick={addRubricRow} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">+ Add criteria</button>
            </div>
            <div className="space-y-2">
              {rubricRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={row.criteria} onChange={e => updateRubricRow(i, 'criteria', e.target.value)} className={`${inputClass} flex-1`} placeholder="Criteria" />
                  <input type="number" value={row.marks} onChange={e => updateRubricRow(i, 'marks', Number(e.target.value))} className="w-20 px-2 py-2 border border-gray-300 rounded text-sm" min={0} />
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={saveAssignment} disabled={savingAssign} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {savingAssign ? 'Saving...' : 'Save assignment'}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'

type QuestionSafe = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; marks: number }

export function TakeQuiz({
  questions,
  totalMarks,
  assessmentId,
}: { questions: QuestionSafe[]; totalMarks: number; assessmentId: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ marks_obtained: number; total_marks: number } | null>(null)
  const [error, setError] = useState('')

  function handleChange(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (questions.some(q => !answers[q.id])) {
      setError('Please answer every question.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/student/quiz-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, answers }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || res.statusText)
      }
      const data = await res.json()
      setResult({ marks_obtained: data.marks_obtained, total_marks: data.total_marks })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  if (result !== null) {
    const pct = result.total_marks > 0 ? Math.round((result.marks_obtained / result.total_marks) * 100) : 0
    return (
      <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl">
        <h3 className="font-semibold text-green-900 text-lg">Quiz submitted</h3>
        <p className="text-2xl font-bold text-green-800 mt-2">{result.marks_obtained} / {result.total_marks} ({pct}%)</p>
        <p className="text-sm text-green-700 mt-1">Your result has been recorded.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {questions.map((q, idx) => (
        <div key={q.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
          <p className="font-medium text-gray-900 mb-3">
            {idx + 1}. {q.question}
          </p>
          <p className="text-xs text-gray-500 mb-2">{q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map(letter => {
              const option = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[letter]
              if (!option) return null
              return (
                <label key={letter} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white">
                  <input
                    type="radio"
                    name={q.id}
                    value={letter}
                    checked={answers[q.id] === letter}
                    onChange={() => handleChange(q.id, letter)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-800">{option}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-5 rounded-lg text-sm">
        {loading ? 'Submitting...' : 'Submit quiz'}
      </button>
    </form>
  )
}

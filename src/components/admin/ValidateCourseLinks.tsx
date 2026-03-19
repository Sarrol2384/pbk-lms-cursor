'use client'

import { useState } from 'react'

type Result = { url: string; label: string; type: string; status: 'ok' | 'failed'; message: string }

type Props = { courseId: string; moduleId?: string; moduleTitle?: string; compact?: boolean }

export default function ValidateCourseLinks({ courseId, moduleId, moduleTitle, compact }: Props) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)

  async function runCheck() {
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch('/api/admin/validate-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, ...(moduleId && { moduleId }) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Check failed')
      setResults(data.results ?? [])
    } catch (err) {
      setResults([{ url: '—', label: 'Error', type: '', status: 'failed', message: err instanceof Error ? err.message : 'Request failed' }])
    } finally {
      setLoading(false)
    }
  }

  const isModuleOnly = Boolean(moduleId)
  return (
    <div className={compact ? 'rounded-lg border border-gray-200 p-3 bg-white' : 'bg-white rounded-xl border border-gray-200 p-5'}>
      {!compact && (
        <>
          <h3 className="font-semibold text-gray-900 mb-1">Validate links</h3>
          <p className="text-sm text-gray-500 mb-3">
            {isModuleOnly
              ? `Check resource and video links in this module only.`
              : 'Check that all resource and video links in this course are reachable. For large courses, use per-module validation in the Modules list below.'}
          </p>
        </>
      )}
      <button
        onClick={runCheck}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Checking…' : isModuleOnly ? `Check links (this module)` : 'Check resource & video links'}
      </button>
      {results && (
        <div className={`space-y-2 overflow-y-auto ${compact ? 'mt-2 max-h-48' : 'mt-4 max-h-80'}`}>
          {results.length === 0 ? (
            <p className="text-sm text-gray-500">No video or resource links in {isModuleOnly ? 'this module' : 'this course'}.</p>
          ) : (
            results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-sm p-2 rounded-lg ${r.status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
              >
                <span className="shrink-0">{r.status === 'ok' ? '✓' : '✗'}</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.label}</p>
                  {r.url !== '—' && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs truncate block text-blue-600 hover:underline">
                      {r.url}
                    </a>
                  )}
                  {r.message && <p className="text-xs mt-0.5">{r.message}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

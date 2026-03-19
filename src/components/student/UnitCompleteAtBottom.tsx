'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Renders a sentinel at the bottom of the unit. When the user scrolls it into
 * view, the unit is marked complete. Resources are optional and do not need
 * to be clicked. Includes a manual button as fallback.
 */
export function UnitCompleteAtBottom({ unitId }: { unitId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const recordedRef = useRef(false)

  const markComplete = useCallback(() => {
    if (recordedRef.current) return
    recordedRef.current = true
    setLoading(true)
    fetch('/api/student/unit-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId }),
    })
      .then((res) => res.ok && setCompleted(true))
      .catch(() => { recordedRef.current = false })
      .finally(() => setLoading(false))
  }, [unitId])

  useEffect(() => {
    if (!unitId) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [e] = entries
        if (!e?.isIntersecting || recordedRef.current) return
        markComplete()
      },
      { root: null, rootMargin: '0px 0px 80px 0px', threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [unitId, markComplete])

  return (
    <div
      ref={sentinelRef}
      className="mt-6 pt-4 border-t border-gray-200 rounded-lg bg-gray-50 px-4 py-3 text-center"
    >
      {completed ? (
        <p className="text-sm text-green-700 font-medium">Unit marked complete. You can continue to the next unit or assessments.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">You&apos;ve reached the end of this unit. Scroll here to mark it complete (you don&apos;t need to click the suggested reading).</p>
          <button
            type="button"
            onClick={markComplete}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
          >
            {loading ? 'Marking…' : 'Or click here to mark complete'}
          </button>
        </div>
      )}
    </div>
  )
}

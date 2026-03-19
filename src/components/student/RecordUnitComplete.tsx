'use client'

import { useEffect } from 'react'

export function RecordUnitComplete({ unitId }: { unitId: string }) {
  useEffect(() => {
    if (!unitId) return
    fetch('/api/student/unit-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId }),
    }).catch(() => {})
  }, [unitId])
  return null
}

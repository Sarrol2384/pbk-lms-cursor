'use client'

import { useSearchParams } from 'next/navigation'

export default function SavedNotice() {
  const searchParams = useSearchParams()
  if (searchParams.get('saved') !== '1') return null

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p className="text-sm text-amber-800">
        <strong>Application saved.</strong> Your banking details are on this page below. Upload your proof of payment when ready.
      </p>
    </div>
  )
}

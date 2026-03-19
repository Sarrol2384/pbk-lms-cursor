'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function deleteCourse() {
    setLoading(true)
    const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      alert('Failed to delete course. Please try again.')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Sure?</span>
        <button onClick={deleteCourse} disabled={loading}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-medium disabled:opacity-50">
          {loading ? '...' : 'Yes, delete'}
        </button>
        <button onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200">
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 font-medium ml-3"
      title={`Delete ${courseTitle}`}>
      Delete
    </button>
  )
}

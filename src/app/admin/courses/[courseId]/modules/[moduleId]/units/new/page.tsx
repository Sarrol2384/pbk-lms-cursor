'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewUnitPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const moduleId = params.moduleId as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: units } = await supabase.from('units').select('sequence').eq('module_id', moduleId).order('sequence', { ascending: false })
    const nextSeq = (units?.[0]?.sequence ?? 0) + 1

    const { error: err } = await supabase.from('units').insert({
      module_id: moduleId,
      title: title.trim(),
      content: content.trim() || null,
      video_url: videoUrl.trim() || null,
      sequence: nextSeq,
      resources: [],
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
          <h1 className="text-2xl font-bold text-gray-900">Add Unit</h1>
          <p className="text-gray-500 text-sm">Add a new learning unit to this module</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Introduction to Management" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} className={`${inputClass} resize-y`} placeholder="Learning material (800+ words recommended)..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} type="url" className={inputClass} placeholder="https://... (Cloudflare Stream or YouTube)" />
        </div>
        <div className="flex gap-3 pt-2">
          <Link href={`/admin/courses/${courseId}`} className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm">
            {loading ? 'Saving...' : 'Save unit'}
          </button>
        </div>
      </form>
    </div>
  )
}

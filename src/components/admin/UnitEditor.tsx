'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Unit = { id: string; module_id: string; title: string; content: string | null; video_url: string | null; resources: unknown; sequence: number }
type UnitResource = { title?: string; type?: string; url?: string; reason?: string; author?: string; publisher?: string; year?: string }

export default function UnitEditor({ unit, courseId }: { unit: Unit; courseId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState(unit.title)
  const [content, setContent] = useState(unit.content ?? '')
  const [videoUrl, setVideoUrl] = useState(unit.video_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resources = Array.isArray(unit.resources) ? (unit.resources as UnitResource[]) : []

  useEffect(() => {
    setTitle(unit.title)
    setContent(unit.content ?? '')
    setVideoUrl(unit.video_url ?? '')
  }, [unit])

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('units')
      .update({ title: title.trim(), content: content.trim() || null, video_url: videoUrl.trim() || null })
      .eq('id', unit.id)
    if (err) { setError(err.message); setSaving(false); return }
    router.refresh()
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Unit title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content (learning material)</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={16} className={`${inputClass} resize-y`} placeholder="800+ words recommended..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} type="url" className={inputClass} placeholder="Cloudflare Stream or YouTube link" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Suggested resources</label>
        {resources.length === 0 ? (
          <p className="text-sm text-gray-500">No suggested resources yet.</p>
        ) : (
          <div className="space-y-2">
            {resources.map((r, i) => (
              <div key={`${r.title ?? 'resource'}-${i}`} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{r.title || `Resource ${i + 1}`}</p>
                {(r.type === 'book' && (r.author || r.publisher || r.year)) && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {[r.author, r.publisher, r.year].filter(Boolean).join(' · ')}
                  </p>
                )}
                {r.type !== 'book' && <p className="text-xs text-gray-500 mt-0.5">{(r.type || 'resource').toUpperCase()}</p>}
                {r.reason && <p className="text-sm text-gray-700 mt-1">{r.reason}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                    {r.type === 'book' ? 'Find / buy' : 'Open resource'}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pt-2 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

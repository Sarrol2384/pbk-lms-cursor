import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const CHECK_TIMEOUT_MS = 8000

async function checkUrl(url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
    const opts = { redirect: 'follow' as const, signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PBK-LMS-LinkChecker/1.0)' } }
    let res = await fetch(url, { ...opts, method: 'HEAD' })
    if (res.status === 405) {
      clearTimeout(timeout)
      const c2 = new AbortController()
      const t2 = setTimeout(() => c2.abort(), CHECK_TIMEOUT_MS)
      res = await fetch(url, { ...opts, signal: c2.signal, method: 'GET' })
      clearTimeout(t2)
    } else {
      clearTimeout(timeout)
    }
    if (res.ok) return { ok: true, message: `HTTP ${res.status}` }
    return { ok: false, message: `HTTP ${res.status}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('abort')) return { ok: false, message: 'Timeout' }
    return { ok: false, message: message.slice(0, 80) }
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { courseId, moduleId } = await request.json()
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const service = createServiceClient()
  let query = service
    .from('modules')
    .select('id, title, units(id, title, video_url, resources)')
    .eq('course_id', courseId)
  if (moduleId) {
    query = query.eq('id', moduleId)
  }
  const { data: modules } = await query.order('sequence', { ascending: true })

  const entries: { url: string; label: string; type: 'video' | 'resource' }[] = []
  for (const mod of modules ?? []) {
    for (const u of (mod as any).units ?? []) {
      const unitTitle = (u as any).title ?? 'Unit'
      const modTitle = (mod as any).title ?? 'Module'
      const label = `${modTitle} → ${unitTitle}`
      if ((u as any).video_url) {
        entries.push({ url: (u as any).video_url, label: `${label} (video)`, type: 'video' })
      }
      const resources = Array.isArray((u as any).resources) ? (u as any).resources : []
      for (const r of resources) {
        const url = r?.url ?? r?.link
        if (url && typeof url === 'string' && url.startsWith('http')) {
          entries.push({ url, label: `${label} (resource: ${r?.title ?? 'link'})`, type: 'resource' })
        }
      }
    }
  }

  const seen = new Set<string>()
  const unique = entries.filter(e => {
    const key = e.url.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const results: { url: string; label: string; type: string; status: 'ok' | 'failed'; message: string }[] = []
  for (const e of unique) {
    const { ok, message } = await checkUrl(e.url)
    results.push({
      url: e.url,
      label: e.label,
      type: e.type,
      status: ok ? 'ok' : 'failed',
      message: ok ? message : message,
    })
  }

  return NextResponse.json({ results })
}

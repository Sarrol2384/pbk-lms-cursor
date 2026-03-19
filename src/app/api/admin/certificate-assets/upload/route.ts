import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null // 'logo' | 'signature1' | 'signature2' | 'seal'
  if (!file || !type || !['logo', 'signature1', 'signature2', 'seal'].includes(type)) {
    return NextResponse.json({ error: 'file and type (logo|signature1|signature2|seal) required' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use PNG or JPG' }, { status: 400 })

  const service = createServiceClient()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${type}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await service.storage.from('certificate-assets').upload(path, buffer, { contentType: file.type, upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('certificate-assets').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}

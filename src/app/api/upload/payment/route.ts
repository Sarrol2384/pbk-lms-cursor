import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Invalid file type. Use PDF, JPG or PNG.' }, { status: 400 })

  const service = createServiceClient()
  const ext = file.name.split('.').pop()
  const path = `proof-of-payment/${user.id}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await service.storage
    .from('payments')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('payments').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}

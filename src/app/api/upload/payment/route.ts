import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { paymentProofBytesMatch } from '@/lib/storage/signed-url'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size <= 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const ext = MIME_EXT[file.type]
  if (!ext) return NextResponse.json({ error: 'Invalid file type. Use PDF, JPG or PNG.' }, { status: 400 })

  const service = createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!paymentProofBytesMatch(file.type, buffer)) {
    return NextResponse.json({ error: 'File contents do not match a PDF, JPG or PNG.' }, { status: 400 })
  }

  const path = `proof-of-payment/${user.id}-${Date.now()}.${ext}`

  const { error: uploadError } = await service.storage
    .from('payments')
    .upload(path, buffer, { contentType: file.type === 'image/jpg' ? 'image/jpeg' : file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signed, error: signErr } = await service.storage.from('payments').createSignedUrl(path, 60 * 60)
  return NextResponse.json({ path, url: signErr ? null : signed?.signedUrl ?? null })
}

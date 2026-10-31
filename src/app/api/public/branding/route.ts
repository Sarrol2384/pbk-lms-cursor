import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { INSTITUTE_NAME } from '@/lib/institute'

export const dynamic = 'force-dynamic'

/**
 * Public institution name for portal sidebars.
 * The site emblem is a static file (/brand/emblem-256.webp). Certificate
 * artwork still comes from certificate_settings.logo_url and seal_url.
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ institution_name: INSTITUTE_NAME })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('certificate_settings')
    .select('institution_name')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ institution_name: INSTITUTE_NAME })
  }

  return NextResponse.json({
    institution_name: data?.institution_name || INSTITUTE_NAME,
  })
}

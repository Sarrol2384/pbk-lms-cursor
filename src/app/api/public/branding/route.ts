import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { INSTITUTE_NAME } from '@/lib/institute'

export const dynamic = 'force-dynamic'

/**
 * Public branding info used across the app (logo + institution name).
 * Reads from certificate_settings so the same logo used on certificates
 * is also used in the UI sidebars and other places.
 */
export async function GET() {
  const service = createServiceClient()

  const { data, error } = await service
    .from('certificate_settings')
    .select('institution_name, logo_url')
    .limit(1)
    .single()

  if (error) {
    // Fail gracefully – just fall back to defaults.
    return NextResponse.json({
      institution_name: INSTITUTE_NAME,
      logo_url: null,
    })
  }

  return NextResponse.json({
    institution_name: data?.institution_name || INSTITUTE_NAME,
    logo_url: data?.logo_url ?? null,
  })
}


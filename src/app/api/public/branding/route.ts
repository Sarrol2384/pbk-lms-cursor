import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { INSTITUTE_LOGO_PNG } from '@/lib/brand'
import { INSTITUTE_NAME } from '@/lib/institute'

export const dynamic = 'force-dynamic'

/**
 * Public branding used by the signed-in portals.
 * The emblem is the file shipped with the app. Institution name still comes
 * from certificate_settings; that row's logo_url is not read or written here.
 */
export async function GET() {
  const service = createServiceClient()

  const { data, error } = await service
    .from('certificate_settings')
    .select('institution_name')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({
      institution_name: INSTITUTE_NAME,
      logo_url: INSTITUTE_LOGO_PNG,
    })
  }

  return NextResponse.json({
    institution_name: data?.institution_name || INSTITUTE_NAME,
    logo_url: INSTITUTE_LOGO_PNG,
  })
}

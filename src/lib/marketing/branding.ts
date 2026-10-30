import { createServiceClient } from '@/lib/supabase/server'
import { INSTITUTE_NAME } from '@/lib/institute'

export type MarketingBranding = {
  institutionName: string
  logoUrl: string | null
}

export async function getMarketingBranding(): Promise<MarketingBranding> {
  const fallback: MarketingBranding = { institutionName: INSTITUTE_NAME, logoUrl: null }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fallback
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('certificate_settings')
      .select('institution_name, logo_url')
      .limit(1)
      .single()

    return {
      institutionName: data?.institution_name || INSTITUTE_NAME,
      logoUrl: data?.logo_url ?? null,
    }
  } catch {
    return fallback
  }
}

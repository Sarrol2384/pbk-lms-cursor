import { createServiceClient } from '@/lib/supabase/server'

export type MarketingBranding = {
  institutionName: string
  logoUrl: string | null
}

export async function getMarketingBranding(): Promise<MarketingBranding> {
  const service = createServiceClient()
  const { data } = await service
    .from('certificate_settings')
    .select('institution_name, logo_url')
    .limit(1)
    .single()

  return {
    institutionName: data?.institution_name || 'PBK Management and Leadership Institute',
    logoUrl: data?.logo_url ?? null,
  }
}

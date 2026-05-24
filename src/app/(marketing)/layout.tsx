import { getMarketingBranding } from '@/lib/marketing/branding'
import { PublicNav } from '@/components/marketing/PublicNav'
import { PublicFooter } from '@/components/marketing/PublicFooter'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const branding = await getMarketingBranding()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicNav branding={branding} />
      <main className="flex-1">{children}</main>
      <PublicFooter branding={branding} />
    </div>
  )
}

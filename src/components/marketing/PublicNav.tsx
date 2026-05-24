import Link from 'next/link'
import type { MarketingBranding } from '@/lib/marketing/branding'
import { InstitutionLogo } from './InstitutionLogo'
import { mainNavLinks } from '@/content/marketing'
import { PublicNavLinks } from './PublicNavLinks'

export function PublicNav({ branding }: { branding: MarketingBranding }) {
  return (
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-20 py-2 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0 shrink">
          <InstitutionLogo logoUrl={branding.logoUrl} institutionName={branding.institutionName} size="nav" />
          <span className="font-bold text-gray-900 text-base sm:text-lg truncate">{branding.institutionName}</span>
        </Link>
        <PublicNavLinks />
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium hidden sm:inline">
            Sign in
          </Link>
          <Link
            href="/apply"
            className="text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            Apply
          </Link>
        </div>
      </div>
      <div className="md:hidden border-t border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        {mainNavLinks.map(({ href, label }) => (
          <Link key={href} href={href} className="text-xs font-medium text-gray-600 whitespace-nowrap px-2 py-1 rounded bg-gray-50">
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

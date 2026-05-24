import Link from 'next/link'
import type { MarketingBranding } from '@/lib/marketing/branding'
import { navLinks } from '@/content/marketing'

export function PublicFooter({ branding }: { branding: MarketingBranding }) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@pbkleadership.org.za'
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          <div>
            <p className="font-semibold text-gray-900">{branding.institutionName}</p>
            <p className="text-sm text-gray-500 mt-2">
              Questions?{' '}
              <a href={`mailto:${supportEmail}`} className="text-blue-700 hover:underline">
                {supportEmail}
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm text-gray-500 hover:text-gray-900">
                {label}
              </Link>
            ))}
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">
              Sign in
            </Link>
          </nav>
        </div>
        <p className="text-center sm:text-left text-sm text-gray-400 mt-8">
          © {year} {branding.institutionName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

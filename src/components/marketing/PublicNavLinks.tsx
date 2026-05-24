'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mainNavLinks } from '@/content/marketing'

export function PublicNavLinks() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex items-center gap-1">
      {mainNavLinks.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              active ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

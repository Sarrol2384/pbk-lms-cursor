'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mainNavLinks } from '@/content/marketing'

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function PublicNavLinks() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex items-center gap-1">
      {mainNavLinks.map(({ href, label }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium px-2.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
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

export function PublicNavChips() {
  const pathname = usePathname()

  return (
    <div className="lg:hidden border-t border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
      {mainNavLinks.map(({ href, label }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={`text-xs font-medium whitespace-nowrap px-2 py-1 rounded ${
              active ? 'text-blue-700 bg-blue-50' : 'text-gray-600 bg-gray-50'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

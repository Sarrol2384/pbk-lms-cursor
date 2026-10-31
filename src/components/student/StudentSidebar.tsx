'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { INSTITUTE_NAME } from '@/lib/institute'
import { PortalBrandHeader } from '@/components/brand/PortalBrandHeader'

const navItems = [
  { href: '/student/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/student/courses', label: 'My Courses', icon: '📚' },
  { href: '/student/certificates', label: 'Certificates', icon: '🏆' },
]

export default function StudentSidebar({ profile }: { profile: { first_name?: string | null; last_name?: string | null; email?: string | null } }) {
  const pathname = usePathname()
  const router = useRouter()
  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const email = profile?.email ?? ''
  const [institutionName, setInstitutionName] = useState(INSTITUTE_NAME)

  useEffect(() => {
    let cancelled = false
    async function loadBranding() {
      try {
        const res = await fetch('/api/public/branding', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { institution_name?: string }
        if (!cancelled) setInstitutionName(data.institution_name || INSTITUTE_NAME)
      } catch {
        // keep the default name; the emblem is a static asset
      }
    }
    loadBranding()
    const onFocus = () => loadBranding()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login?from=logout')
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <PortalBrandHeader institutionName={institutionName} portal="Student Portal" />
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}>
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
            {getInitials(firstName, lastName) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{firstName} {lastName}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
        </div>
        <button onClick={signOut} className="w-full text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg font-medium transition-colors text-left">
          Log out
        </button>
      </div>
    </aside>
  )
}

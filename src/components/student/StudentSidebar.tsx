'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { INSTITUTE_NAME } from '@/lib/institute'
import { InstitutionLogo } from '@/components/marketing/InstitutionLogo'

const navItems = [
  { href: '/student/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/student/courses', label: 'My Courses', icon: '📚' },
  { href: '/student/certificates', label: 'Certificates', icon: '🏆' },
]

type Branding = { institution_name: string }

export default function StudentSidebar({ profile }: { profile: { first_name?: string | null; last_name?: string | null; email?: string | null } }) {
  const pathname = usePathname()
  const router = useRouter()
  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const email = profile?.email ?? ''
  const [branding, setBranding] = useState<Branding>({ institution_name: INSTITUTE_NAME })

  useEffect(() => {
    let cancelled = false
    async function loadBranding() {
      try {
        const res = await fetch('/api/public/branding', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as Branding
        if (!cancelled) setBranding({ institution_name: data.institution_name || INSTITUTE_NAME })
      } catch {
        // ignore – fall back to defaults
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
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-gray-100 bg-white">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <InstitutionLogo size="sidebar" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-3">{branding.institution_name}</p>
            <p className="text-xs text-gray-400">Student Portal</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
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

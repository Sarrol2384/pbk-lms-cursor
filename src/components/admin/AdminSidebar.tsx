'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
  { href: '/admin/students', label: 'Students', icon: '👥' },
  { href: '/admin/enrollments', label: 'Enrollments', icon: '📋' },
  { href: '/admin/courses', label: 'Courses', icon: '📚' },
  { href: '/admin/certificates', label: 'Certificates', icon: '🏆' },
  { href: '/admin/certificate-settings', label: 'Certificate design', icon: '📄' },
  { href: '/admin/reports', label: 'Reports', icon: '📊' },
]

type Branding = { institution_name: string; logo_url: string | null }

export default function AdminSidebar({ profile }: { profile: { first_name: string; last_name: string; email: string; role: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const [branding, setBranding] = useState<Branding>({ institution_name: 'PBK University', logo_url: null })

  useEffect(() => {
    let cancelled = false
    async function loadBranding() {
      try {
        const res = await fetch('/api/public/branding', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as Branding
        if (!cancelled) setBranding({ institution_name: data.institution_name || 'PBK University', logo_url: data.logo_url ?? null })
      } catch {
        // ignore and keep defaults
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
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <div className="w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
              <img src={branding.logo_url} alt={branding.institution_name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-28 h-28 shrink-0 bg-blue-700 rounded-lg flex items-center justify-center text-white text-2xl font-bold">PBK</div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{branding.institution_name}</p>
            <p className="text-xs text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
            style={{ cursor: 'pointer' }}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
            {getInitials(profile.first_name, profile.last_name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile.first_name} {profile.last_name}</p>
            <p className="text-xs text-gray-400 capitalize">{profile.role.replace('_', ' ')}</p>
          </div>
        </div>
        <button onClick={signOut} className="w-full text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg font-medium transition-colors text-left">
          Log out
        </button>
      </div>
    </aside>
  )
}

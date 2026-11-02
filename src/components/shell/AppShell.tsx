'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const drawerClosedOnMobile = !isDesktop && !open

  useEffect(() => {
    const el = drawerRef.current
    if (!el) return
    if (drawerClosedOnMobile) el.setAttribute('inert', '')
    else el.removeAttribute('inert')
  }, [drawerClosedOnMobile])

  const drawerOpen = open && !isDesktop

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={drawerRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 max-w-[85vw] shrink-0 transform flex-col bg-white shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:max-w-none md:translate-x-0 md:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-hidden={drawerClosedOnMobile}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 md:hidden">
          <span className="text-sm font-medium text-gray-900">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div
          className="min-h-0 flex-1"
          onClick={e => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false)
          }}
        >
          {sidebar}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-2 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="truncate text-sm font-semibold text-gray-900">Menu</span>
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

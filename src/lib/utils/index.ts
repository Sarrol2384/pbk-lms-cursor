import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000
  return `PBK-${year}-${random}`
}

export function calculateModuleMark(scores: number[], weights: number[]): number {
  if (scores.length === 0) return 0
  const weighted = scores.reduce((sum, s, i) => sum + s * (weights[i] / 100), 0)
  return Math.round(weighted * 100) / 100
}

export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase()
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Payment plan deadline: startDate + totalInstallments months. Returns deadline date and whether it has passed. */
export function getPaymentDeadline(startDate: string | null | undefined, totalInstallments: number): { deadline: Date | null; deadlineStr: string; isOverdue: boolean } {
  if (!startDate || totalInstallments < 1) return { deadline: null, deadlineStr: '—', isOverdue: false }
  const start = new Date(startDate)
  const deadline = new Date(start)
  deadline.setMonth(deadline.getMonth() + totalInstallments)
  const now = new Date()
  return {
    deadline,
    deadlineStr: deadline.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
    isOverdue: now > deadline,
  }
}

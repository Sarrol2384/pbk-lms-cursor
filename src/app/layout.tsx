import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { INSTITUTE_NAME } from '@/lib/institute'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: INSTITUTE_NAME,
    template: '%s | PBK Institute',
  },
  description: 'Accredited management and leadership qualifications — apply online.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { INSTITUTE_NAME } from '@/lib/institute'

const inter = Inter({ subsets: ['latin'] })

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: INSTITUTE_NAME,
    template: '%s | PBK Institute',
  },
  description: 'Accredited management and leadership qualifications — apply online.',
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: INSTITUTE_NAME,
    description: 'Accredited management and leadership qualifications — apply online.',
    images: [{ url: '/brand/og.jpg', width: 1200, height: 630, alt: INSTITUTE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/brand/og.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

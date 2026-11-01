import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { INSTITUTE_NAME } from '@/lib/institute'
import { siteUrl } from '@/lib/site-url'

const inter = Inter({ subsets: ['latin'] })

const description = 'Accredited management and leadership qualifications — apply online.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: INSTITUTE_NAME,
    template: '%s | PBK Institute',
  },
  description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: INSTITUTE_NAME,
    description,
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: INSTITUTE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: INSTITUTE_NAME,
    description,
    images: ['/brand/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

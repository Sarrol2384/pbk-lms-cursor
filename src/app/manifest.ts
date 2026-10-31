import type { MetadataRoute } from 'next'
import { INSTITUTE_NAME } from '@/lib/institute'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: INSTITUTE_NAME,
    short_name: 'PBK Institute',
    description: 'Accredited management and leadership qualifications.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

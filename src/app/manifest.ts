import type { MetadataRoute } from 'next'
import { INSTITUTE_NAME, INSTITUTE_MOTTO } from '@/lib/institute'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: INSTITUTE_NAME,
    short_name: 'PBK Institute',
    description: INSTITUTE_MOTTO,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

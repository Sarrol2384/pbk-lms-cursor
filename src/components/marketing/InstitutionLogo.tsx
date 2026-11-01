import Image from 'next/image'
import { INSTITUTE_LOGO_SRC } from '@/lib/brand'

type LogoSize = 'nav' | 'footer' | 'auth' | 'sidebar'

const frame: Record<LogoSize, string> = {
  // Seal stays readable beside the long institute name without crowding the bar.
  nav: 'h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16',
  footer: 'h-12 w-12 sm:h-14 sm:w-14',
  auth: 'h-24 w-24 sm:h-28 sm:w-28',
  sidebar: 'h-12 w-12 sm:h-14 sm:w-14',
}

const sizes: Record<LogoSize, string> = {
  nav: '(min-width: 1024px) 64px, (min-width: 640px) 56px, 48px',
  footer: '(min-width: 640px) 56px, 48px',
  auth: '(min-width: 640px) 112px, 96px',
  sidebar: '(min-width: 640px) 56px, 48px',
}

export function InstitutionLogo({
  size = 'nav',
  priority = false,
  className = '',
}: {
  size?: LogoSize
  priority?: boolean
  className?: string
}) {
  return (
    <span className={`relative block shrink-0 ${frame[size]} ${className}`}>
      <Image
        src={INSTITUTE_LOGO_SRC}
        alt=""
        fill
        sizes={sizes[size]}
        priority={priority}
        quality={92}
        className="object-contain drop-shadow-md"
      />
    </span>
  )
}

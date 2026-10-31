const SIZES = {
  nav: 'w-20 h-20 sm:w-24 sm:h-24',
  portal: 'w-24 h-24',
  footer: 'w-16 h-16',
  auth: 'w-32 h-32',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
} as const

/** Circular institute emblem. Square box so the round badge is not stretched. */
export function InstitutionLogo({
  institutionName,
  size = 'md',
  className = '',
}: {
  institutionName: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <picture className={`shrink-0 block ${SIZES[size]} ${className}`}>
      <source srcSet="/brand/emblem-256.webp" type="image/webp" />
      <img
        src="/brand/emblem-256.png"
        alt={institutionName}
        width={256}
        height={256}
        className="w-full h-full object-contain"
      />
    </picture>
  )
}

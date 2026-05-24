export function InstitutionLogo({
  logoUrl,
  institutionName,
  size = 'md',
}: {
  logoUrl: string | null
  institutionName: string
  size?: 'sm' | 'md' | 'nav'
}) {
  const box =
    size === 'nav' ? 'w-28 h-28' : size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
  const icon =
    size === 'nav' ? 'w-14 h-14' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  if (logoUrl) {
    return (
      <div className={`${box} rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center shrink-0`}>
        <img src={logoUrl} alt={institutionName} className="w-full h-full object-contain" />
      </div>
    )
  }

  return (
    <div className={`${box} bg-blue-700 rounded-lg flex items-center justify-center shrink-0`}>
      <svg className={`${icon} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 6.075-4.925 11-11 11S1 18.075 1 12a12.08 12.08 0 012.84-7.757L12 14z" />
      </svg>
    </div>
  )
}

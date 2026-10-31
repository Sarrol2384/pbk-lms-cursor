import { InstitutionLogo } from '@/components/marketing/InstitutionLogo'

export function PortalBrandHeader({
  institutionName,
  portal,
}: {
  institutionName: string
  portal: string
}) {
  return (
    <div className="px-4 pt-5 pb-4 border-b border-gray-100 flex flex-col items-center text-center">
      <InstitutionLogo institutionName={institutionName} size="portal" />
      <p className="mt-3 font-semibold text-gray-900 text-sm leading-snug">{institutionName}</p>
      <p className="text-xs text-gray-400 mt-1">{portal}</p>
    </div>
  )
}

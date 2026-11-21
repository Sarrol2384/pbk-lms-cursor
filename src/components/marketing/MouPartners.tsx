import Image from 'next/image'
import { mouPartners, mouPartnersStatement } from '@/content/marketing'

export function MouPartnerLogos() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {mouPartners.map(partner => (
        <li key={partner.id} className="flex flex-col items-center rounded-xl border border-blue-100 bg-white px-4 py-5 shadow-sm">
          <div className="flex h-24 w-full items-center justify-center sm:h-28">
            <Image
              src={partner.src}
              alt={partner.alt}
              width={partner.width}
              height={partner.height}
              className="h-16 w-auto max-w-full object-contain sm:h-20"
              sizes="(min-width: 640px) 30vw, 90vw"
            />
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-blue-950">{partner.name}</p>
          {partner.detail ? (
            <p className="mt-1 text-center text-xs leading-snug text-gray-500">{partner.detail}</p>
          ) : (
            <p className="mt-1 text-center text-xs text-gray-500">Memorandum of Understanding</p>
          )}
        </li>
      ))}
    </ul>
  )
}

export function MouPartners({ heading = 'Our partners' }: { heading?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{heading}</h2>
      <p className="text-gray-600 leading-relaxed">{mouPartnersStatement}</p>
      <MouPartnerLogos />
    </div>
  )
}

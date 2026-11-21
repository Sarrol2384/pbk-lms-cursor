import { mouPartners, mouPartnersStatement } from '@/content/marketing'

export function MouPartners({ heading = 'Our partners' }: { heading?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{heading}</h2>
      <p className="text-gray-600 leading-relaxed">{mouPartnersStatement}</p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {mouPartners.map(partner => (
          <li key={partner.id}>
            <p className="min-w-[9rem] rounded-xl border border-blue-200 bg-white px-5 py-4 text-center shadow-sm">
              <span className="block text-sm font-semibold tracking-wide text-blue-950">{partner.name}</span>
              <span className="mt-1 block text-xs text-gray-500">Memorandum of Understanding</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

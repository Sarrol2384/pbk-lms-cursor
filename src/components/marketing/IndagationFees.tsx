import { INDAGATION_FEES, formatUsd, type IndagationServiceId } from '@/content/indagation'

function amountFor(
  amounts: Readonly<Record<IndagationServiceId, number>>,
  serviceId: IndagationServiceId,
): number {
  return amounts[serviceId]
}

export function IndagationFees() {
  const { services, levels } = INDAGATION_FEES

  return (
    <>
      <div className="lg:hidden space-y-4">
        {levels.map(level => {
          const amounts = level.amounts
          return (
            <article key={level.id} className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
              <h3 className="bg-blue-700 text-white px-4 py-2.5 font-semibold text-sm sm:text-base">{level.label}</h3>
              {amounts ? (
                <dl className="px-4 py-3 space-y-3 text-sm">
                  {services.map(service => (
                    <div key={service.id} className="flex items-start justify-between gap-4">
                      <dt className="text-gray-600">{service.label}</dt>
                      <dd className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatUsd(amountFor(amounts, service.id))}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="px-4 py-4 text-sm text-gray-700 leading-relaxed">{level.note}</p>
              )}
            </article>
          )
        })}
      </div>

      <div className="hidden lg:block overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <caption className="sr-only">Indagation Institute service fees in US dollars</caption>
          <thead>
            <tr className="bg-blue-700 text-white">
              <th scope="col" className="px-4 py-3 font-semibold align-bottom">
                Level
              </th>
              {services.map(service => (
                <th key={service.id} scope="col" className="px-4 py-3 font-semibold align-bottom min-w-[9rem]">
                  {service.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((level, index) => {
              const amounts = level.amounts
              return (
                <tr key={level.id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                  <th scope="row" className="px-4 py-3 font-semibold text-blue-900 border-t border-blue-100 align-top">
                    {level.label}
                  </th>
                  {amounts ? (
                    services.map(service => (
                      <td
                        key={service.id}
                        className="px-4 py-3 text-gray-800 border-t border-blue-100 tabular-nums whitespace-nowrap align-top"
                      >
                        {formatUsd(amountFor(amounts, service.id))}
                      </td>
                    ))
                  ) : (
                    <td colSpan={services.length} className="px-4 py-3 text-gray-700 border-t border-blue-100">
                      {level.note}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

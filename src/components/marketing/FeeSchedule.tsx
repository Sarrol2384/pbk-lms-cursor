import { PROGRAMME_FEE_SCHEDULE, RPL_REGISTRATION_USD, type FeeTrack } from '@/content/programme-fees'
import { formatUsd } from '@/lib/tuition'

const tracks: { id: FeeTrack; title: string }[] = [
  { id: 'academic', title: 'Academic programmes' },
  { id: 'theology', title: 'Theology & Ministry' },
]

export function FeeSchedule() {
  return (
    <div id="fees" className="space-y-8">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Programme fees</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Amounts are full totals in US dollars. Registration for Master&apos;s and PhD (RPL) is {formatUsd(RPL_REGISTRATION_USD)}.
          Registration for other programmes has not been set.
        </p>
      </div>
      {tracks.map(track => {
        const rows = PROGRAMME_FEE_SCHEDULE.filter(row => row.track === track.id)
        return (
          <div key={track.id} className="overflow-x-auto bg-white border border-blue-100 rounded-xl">
            <table className="w-full text-sm text-left">
              <caption className="px-4 py-3 text-left font-semibold text-blue-950 bg-blue-50">
                {track.title}
              </caption>
              <thead className="text-blue-950">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Qualification</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Duration</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Programme fee</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Registration</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Listed for application</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.level} className="border-t border-blue-50">
                    <th scope="row" className="px-4 py-3 font-medium text-gray-900 text-left">{row.name}</th>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.duration}</td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap font-medium">{formatUsd(row.tuitionUsd)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {row.registrationUsd == null ? 'Not set' : formatUsd(row.registrationUsd)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.offeredOnProspectus ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

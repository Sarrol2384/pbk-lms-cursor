import Link from 'next/link'
import { FeeSchedule } from '@/components/marketing/FeeSchedule'
import {
  PROSPECTUS_YEAR,
  programmeCount,
  programmeOffersRpl,
  prospectusSchools,
  studyLevels,
  studyModes,
} from '@/content/prospectus'
import { CHAPLAINCY_PATH, scheduleRow, trackForSchool } from '@/content/programme-fees'
import { INSTITUTE_MOTTO, INSTITUTE_NAME } from '@/lib/institute'
import { formatUsd } from '@/lib/tuition'

export function Prospectus() {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl mx-auto text-center px-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">
          {PROSPECTUS_YEAR} prospectus
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{INSTITUTE_NAME}</h2>
        <p className="text-lg text-blue-800 font-medium mb-4">&ldquo;{INSTITUTE_MOTTO}&rdquo;</p>
        <p className="text-gray-600 leading-relaxed">
          Programmes are offered from Certificate through Bachelor&apos;s, grouped into five schools.
          Theology & Ministry programmes also list Bachelor&apos;s, and Master&apos;s and PhD via Recognition of Prior Learning (RPL).
          RPL is not used from Certificate through Bachelor&apos;s.
          There are {programmeCount()} programmes in this prospectus. Fees are full totals in US dollars.
          Choose a programme below, then apply online. You do not need an account to submit an application.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Admission and study mode</h2>
        <div className="overflow-x-auto bg-white border border-blue-100 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-blue-50 text-blue-950">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Level</th>
                <th scope="col" className="px-4 py-3 font-semibold">Academic duration</th>
                <th scope="col" className="px-4 py-3 font-semibold">Theology duration</th>
                <th scope="col" className="px-4 py-3 font-semibold">Admission requirement</th>
              </tr>
            </thead>
            <tbody>
              {studyLevels.map(level => (
                <tr key={level.id} className="border-t border-blue-50">
                  <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap text-left">{level.label}</th>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{scheduleRow('academic', level.id).duration}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{scheduleRow('theology', level.id).duration}</td>
                  <td className="px-4 py-3 text-gray-600">{level.admission}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {studyModes.map(mode => (
            <span key={mode.id} className="text-sm bg-white border border-blue-100 text-blue-900 px-3 py-1.5 rounded-full">
              {mode.label}
            </span>
          ))}
        </div>
        <p className="text-center text-sm text-gray-600 mt-4 max-w-3xl mx-auto leading-relaxed">
          Master&apos;s (RPL) and PhD (RPL) are available on Theology & Ministry programmes.
          Academic prices for those two levels are shown in the fee table, and those qualifications are not listed on academic programmes.
          Every programme can be studied full-time, part-time, in the evening, or by online distance learning.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4">
        <FeeSchedule />
      </section>

      <section className="max-w-5xl mx-auto px-4 space-y-10">
        {prospectusSchools.map((school, index) => (
          <div key={school.id} className="bg-white border border-blue-100 rounded-xl p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">School {index + 1}</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1 mb-6">{school.name}</h3>
            {school.programmes.some(programme => programmeOffersRpl(programme)) && (
              <p className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
                Programmes in this school list Bachelor&apos;s, and Master&apos;s and PhD via Recognition of Prior Learning (RPL).
              </p>
            )}
            <ul className="space-y-5">
              {school.programmes.map(programme => (
                <li key={programme.id} className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{programme.name}</h4>
                    {programme.isNew && (
                      <span className="text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{programme.summary}</p>
                  <p className="text-xs text-blue-800 mt-2">
                    {programme.levels.map(levelId => {
                      const level = studyLevels.find(item => item.id === levelId)
                      if (!level) return null
                      const priced = scheduleRow(trackForSchool(school.id), level.id)
                      return `${level.label} (${priced.duration}, ${formatUsd(priced.tuitionUsd)}, registration ${formatUsd(priced.registrationUsd)})`
                    }).filter(Boolean).join(' · ')}
                  </p>
                  {programmeOffersRpl(programme) && (
                    <p className="text-xs text-blue-900 mt-1">
                      Master&apos;s and PhD are available for this programme via Recognition of Prior Learning (RPL). RPL is not used from Certificate through Bachelor&apos;s.
                    </p>
                  )}
                  {programme.id === 'chaplaincy' && (
                    <p className="text-xs text-gray-700 mt-1">
                      Designated, Certified, and Professional Chaplain fees are listed on the{' '}
                      <Link href={CHAPLAINCY_PATH} className="font-semibold text-blue-700 hover:underline">chaplaincy page</Link>.
                    </p>
                  )}
                  <Link
                    href={`/apply?programme=${programme.id}`}
                    className="inline-block mt-3 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Apply for this programme
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

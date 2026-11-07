import Link from 'next/link'
import {
  APPLICATIONS_NOT_OPEN_LABEL,
  openLevelIds,
  programmeAcceptsApplications,
  type QualificationOpening,
} from '@/content/application-availability'
import {
  PROSPECTUS_YEAR,
  programmeCount,
  programmeOffersRpl,
  prospectusSchools,
  studyLevels,
  studyModes,
} from '@/content/prospectus'
import { INSTITUTE_MOTTO, INSTITUTE_NAME } from '@/lib/institute'

export function Prospectus({ openings }: { openings: readonly QualificationOpening[] }) {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl mx-auto text-center px-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">
          {PROSPECTUS_YEAR} prospectus
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{INSTITUTE_NAME}</h2>
        <p className="text-lg text-blue-800 font-medium mb-4">&ldquo;{INSTITUTE_MOTTO}&rdquo;</p>
        <p className="text-gray-600 leading-relaxed">
          Programmes are grouped into five schools. The prospectus names Certificate, Diploma and Advanced Diploma study,
          and Masters and PhD via Recognition of Prior Learning (RPL) for Theology & Ministry.
          There are {programmeCount()} programmes in this prospectus. A programme can be selected on the application form only when that qualification is open.
          You do not need an account to submit an application.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Admission, duration and study mode</h2>
        <p className="text-center text-sm text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
          These rows name the qualification levels used in the prospectus. A programme lists a qualification only when applications for that qualification are open.
        </p>
        <div className="overflow-x-auto bg-white border border-blue-100 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-blue-50 text-blue-950">
              <tr>
                <th className="px-4 py-3 font-semibold">Level</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Admission requirement</th>
              </tr>
            </thead>
            <tbody>
              {studyLevels.map(level => (
                <tr key={level.id} className="border-t border-blue-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{level.label}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{level.duration}</td>
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
          Masters (via RPL) and PhD (via RPL) are the Recognition of Prior Learning qualifications on Theology & Ministry programmes.
          They are not offered at Certificate, Diploma or Advanced Diploma.
          Where applications are open, a programme can be studied full-time, part-time, in the evening, or by online distance learning.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 space-y-10">
        {prospectusSchools.map((school, index) => (
          <div key={school.id} className="bg-white border border-blue-100 rounded-xl p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">School {index + 1}</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1 mb-6">{school.name}</h3>
            {school.programmes.some(programme => programmeOffersRpl(programme)) && (
              <p className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
                Recognition of Prior Learning (RPL) on programmes in this school is Masters and PhD only.
                Those qualifications can be selected when applications for them are open.
              </p>
            )}
            <ul className="space-y-5">
              {school.programmes.map(programme => {
                const openLabels = openLevelIds(programme.id, openings)
                  .map(levelId => studyLevels.find(level => level.id === levelId)?.label)
                  .filter(Boolean)
                return (
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
                  {openLabels.length > 0 && (
                    <p className="text-xs text-blue-800 mt-2">{openLabels.join(' · ')}</p>
                  )}
                  {programmeOffersRpl(programme) && programmeAcceptsApplications(programme.id, openings) && (
                    <p className="text-xs text-blue-900 mt-1">
                      Masters and PhD are available for this programme via Recognition of Prior Learning (RPL).
                    </p>
                  )}
                  {programmeAcceptsApplications(programme.id, openings) ? (
                    <Link
                      href={`/apply?programme=${programme.id}`}
                      className="inline-block mt-3 text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Apply for this programme
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-gray-700">{APPLICATIONS_NOT_OPEN_LABEL}</p>
                  )}
                </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

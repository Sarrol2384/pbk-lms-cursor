import type { StudyPathwayRow } from '@/content/marketing'

const columns = [
  { key: 'level', label: 'Level' },
  { key: 'qualificationType', label: 'Qualification type' },
  { key: 'entryRequirement', label: 'Entry requirement' },
  { key: 'duration', label: 'Duration' },
  { key: 'tuition', label: 'Programme fee' },
  { key: 'registration', label: 'Registration' },
  { key: 'nextStep', label: 'Next step after completion' },
] as const

export function StudyPathwayTable({ caption, rows }: { caption: string; rows: StudyPathwayRow[] }) {
  return (
    <>
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-blue-700 text-white">
              {columns.map(col => (
                <th key={col.key} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.level} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                <th scope="row" className="px-4 py-3 font-semibold text-blue-900 border-t border-blue-100 whitespace-nowrap text-left">
                  {row.level}
                </th>
                <td className="px-4 py-3 text-gray-700 border-t border-blue-100">{row.qualificationType}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100">{row.entryRequirement}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100 whitespace-nowrap">{row.duration}</td>
                <td className="px-4 py-3 text-gray-900 border-t border-blue-100 whitespace-nowrap font-medium">{row.tuition}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100 whitespace-nowrap">{row.registration}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100">{row.nextStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-4">
        {rows.map(row => (
          <article key={row.level} className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
            <h4 className="bg-blue-700 text-white px-4 py-2 font-semibold">{row.level}</h4>
            <dl className="px-4 py-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Qualification</dt>
                <dd className="text-gray-700 mt-0.5">{row.qualificationType}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Entry requirement</dt>
                <dd className="text-gray-600 mt-0.5">{row.entryRequirement}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Duration</dt>
                <dd className="text-gray-600 mt-0.5">{row.duration}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Programme fee</dt>
                <dd className="text-gray-900 mt-0.5 font-medium">{row.tuition}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Registration</dt>
                <dd className="text-gray-600 mt-0.5">{row.registration}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Next step</dt>
                <dd className="text-gray-600 mt-0.5">{row.nextStep}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}

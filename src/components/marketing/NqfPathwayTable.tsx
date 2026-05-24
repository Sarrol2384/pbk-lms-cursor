import type { NqfPathwayRow } from '@/content/marketing'

const columns = [
  { key: 'level', label: 'NQF Level' },
  { key: 'qualificationType', label: 'Qualification Type' },
  { key: 'entryRequirement', label: 'Entry Requirement' },
  { key: 'duration', label: 'Duration' },
  { key: 'nextStep', label: 'Next Step After Completion' },
] as const

export function NqfPathwayTable({ rows }: { rows: NqfPathwayRow[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-blue-700 text-white">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 font-semibold whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.level}
                className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}
              >
                <td className="px-4 py-3 font-semibold text-blue-900 border-t border-blue-100 whitespace-nowrap">
                  {row.level}
                </td>
                <td className="px-4 py-3 text-gray-700 border-t border-blue-100">{row.qualificationType}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100">{row.entryRequirement}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100 whitespace-nowrap">{row.duration}</td>
                <td className="px-4 py-3 text-gray-600 border-t border-blue-100">{row.nextStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-4">
        {rows.map(row => (
          <article
            key={row.level}
            className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm"
          >
            <div className="bg-blue-700 text-white px-4 py-2 font-semibold">{row.level}</div>
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

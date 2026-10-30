import Link from 'next/link'
import { ApplicationsTable, type ApplicationRow } from '@/components/admin/ApplicationsTable'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

export default async function AdminApplicationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status: FilterId = FILTERS.some(item => item.id === searchParams.status)
    ? searchParams.status as FilterId
    : 'all'

  const service = createServiceClient()
  const { data, error } = await service
    .from('prospectus_applications')
    .select('id, created_at, status, first_name, last_name, email, phone, id_number, city, programme_name, school_name, level, study_mode, highest_qualification, document_path')
    .order('created_at', { ascending: false })
    .limit(300)

  const source = (data ?? []) as Array<ApplicationRow & { document_path: string | null }>
  const filtered = source.filter(row => status === 'all' || row.status === status)

  const rows: ApplicationRow[] = await Promise.all(filtered.map(async row => {
    let document_url: string | null = null
    if (row.document_path) {
      const { data: signed } = await service.storage.from('prospectus-applications').createSignedUrl(row.document_path, 60 * 60)
      document_url = signed?.signedUrl ?? null
    }
    return {
      id: row.id,
      created_at: row.created_at,
      status: row.status,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      id_number: row.id_number,
      city: row.city,
      programme_name: row.programme_name,
      school_name: row.school_name,
      level: row.level,
      study_mode: row.study_mode,
      highest_qualification: row.highest_qualification,
      document_url,
    }
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prospectus applications</h1>
        <p className="text-gray-500 text-sm mt-1">
          Applications from the public form. Update the status here, then reply to the applicant from your own email. The site does not send that reply for you.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(item => (
          <Link
            key={item.id}
            href={item.id === 'all' ? '/admin/applications' : `/admin/applications?status=${item.id}`}
            className={`text-sm px-3 py-1.5 rounded-lg border ${status === item.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3">
          Applications could not be loaded. Apply migration <code>00027_prospectus_applications.sql</code> on the database, then refresh this page.
        </div>
      ) : (
        <ApplicationsTable rows={rows} />
      )}
    </div>
  )
}

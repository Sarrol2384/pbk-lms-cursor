'use client'

import { useState } from 'react'
import { studyLevelById, studyModeById } from '@/content/prospectus'
import { INSTITUTE_NAME } from '@/lib/institute'

export type ApplicationRow = {
  id: string
  created_at: string
  status: 'new' | 'contacted' | 'accepted' | 'declined'
  first_name: string
  last_name: string
  email: string
  phone: string
  id_number: string | null
  city: string | null
  country: string | null
  programme_name: string
  school_name: string
  level: string
  study_mode: string
  highest_qualification: string
  document_url: string | null
}

const STATUS_LABELS: Record<ApplicationRow['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  accepted: 'Accepted',
  declined: 'Declined',
}

export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  const [items, setItems] = useState(rows)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function updateStatus(id: string, status: ApplicationRow['status']) {
    setPendingId(id)
    setError(null)
    const previous = items
    setItems(current => current.map(row => row.id === id ? { ...row, status } : row))
    try {
      const response = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        setItems(previous)
        setError('Could not update that status.')
      }
    } catch {
      setItems(previous)
      setError('Could not update that status.')
    } finally {
      setPendingId(null)
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No prospectus applications yet.</p>
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="w-full text-sm text-left min-w-[880px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Received</th>
              <th className="px-4 py-3 font-semibold">Applicant</th>
              <th className="px-4 py-3 font-semibold">Programme</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Reply</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => {
              const when = new Date(row.created_at)
              const subject = encodeURIComponent(`Your application to ${INSTITUTE_NAME} (${row.id.slice(0, 8).toUpperCase()})`)
              return (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {Number.isNaN(when.getTime()) ? row.created_at : when.toLocaleString('en-ZA')}
                    <p className="text-xs text-gray-400 mt-1">{row.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
                    <p className="text-gray-600">{row.email}</p>
                    <p className="text-gray-600">{row.phone}</p>
                    {row.city && <p className="text-gray-500">{row.city}</p>}
                    <p className="text-gray-500">Country: {row.country || '—'}</p>
                    {row.id_number && (
                      <p className="text-gray-500">
                        {row.country && row.country !== 'South Africa' ? 'ID or passport' : 'ID'}: {row.id_number}
                      </p>
                    )}
                    <p className="text-gray-500 mt-1">Highest qualification: {row.highest_qualification}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.programme_name}</p>
                    <p className="text-gray-500">{row.school_name}</p>
                    <p className="text-gray-600 mt-1">{studyLevelById(row.level)?.label || row.level}</p>
                    <p className="text-gray-600">{studyModeById(row.study_mode)?.label || row.study_mode}</p>
                    {row.document_url && (
                      <a href={row.document_url} className="text-blue-700 hover:underline text-xs mt-1 inline-block" target="_blank" rel="noreferrer">
                        View document
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`status-${row.id}`}>Status for {row.first_name} {row.last_name}</label>
                    <select
                      id={`status-${row.id}`}
                      value={row.status}
                      disabled={pendingId === row.id}
                      onChange={event => updateStatus(row.id, event.target.value as ApplicationRow['status'])}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    >
                      {(Object.keys(STATUS_LABELS) as ApplicationRow['status'][]).map(status => (
                        <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${row.email}?subject=${subject}`}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      Reply by email
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

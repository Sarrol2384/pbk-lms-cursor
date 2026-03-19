'use client'

import { useState } from 'react'
import { formatDateShort } from '@/lib/utils'

export type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  id_number: string | null
  role: string
  created_at: string
}

export default function UsersTable({ students, staff, currentUserId }: { students: UserRow[]; staff: UserRow[]; currentUserId?: string | null }) {
  const [studentRows, setStudentRows] = useState<UserRow[]>(students)
  const [staffRows, setStaffRows] = useState<UserRow[]>(staff)
  const [message, setMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function removeUser(user: UserRow, isStaff?: boolean) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'this user'
    const msg = isStaff
      ? `Remove ${name}? This is an admin/super-admin account. They will lose access. This cannot be undone.`
      : `Remove ${name}? This cannot be undone.`
    if (!window.confirm(msg)) return
    setDeletingId(user.id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not remove user.')
      } else {
        setStudentRows(prev => prev.filter(s => s.id !== user.id))
        setStaffRows(prev => prev.filter(s => s.id !== user.id))
        setMessage('User removed.')
      }
    } catch {
      setMessage('Request failed. Please try again.')
    } finally {
      setDeletingId(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const renderTable = (rows: UserRow[], showActions: boolean, isStaffTable?: boolean) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">ID number</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Joined</th>
              {showActions && <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 7 : 6} className="py-8 text-center text-gray-500">No users.</td>
              </tr>
            ) : (
              rows.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{u.email ?? '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{u.phone ?? '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{u.id_number ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === 'super_admin'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{formatDateShort(u.created_at)}</td>
                  {showActions && (
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => removeUser(u, isStaffTable)}
                        disabled={deletingId === u.id || (isStaffTable && currentUserId === u.id)}
                        className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded disabled:opacity-50"
                      >
                        {currentUserId === u.id ? 'Current user' : deletingId === u.id ? 'Removing…' : 'Remove user'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Students</h2>
          <p className="text-xs text-gray-500">Individual learners applying for and taking courses.</p>
        </div>
        {renderTable(studentRows, true)}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Admins & staff</h2>
          <p className="text-xs text-gray-500">Super admins can remove other admin accounts. You cannot remove your own account.</p>
        </div>
        {renderTable(staffRows, true, true)}
      </section>
    </div>
  )
}


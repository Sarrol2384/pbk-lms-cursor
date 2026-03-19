import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminReportsPage() {
  const supabase = createServiceClient()

  const [enrollments, certificates, students] = await Promise.all([
    supabase.from('enrollments').select('id, status', { count: 'exact' }),
    supabase.from('certificates').select('id', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Analytics and SETA reporting</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Students', value: students.count ?? 0, icon: '👥', color: 'text-blue-600' },
          { label: 'Certificates Issued', value: certificates.count ?? 0, icon: '🏆', color: 'text-green-600' },
          { label: 'Total Enrollments', value: enrollments.count ?? 0, icon: '📋', color: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl mb-1">{stat.icon}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">SETA Export</h2>
        <p className="text-sm text-gray-500 mb-4">Download learner and assessment data for SETA reporting.</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          Export to CSV
        </button>
      </div>
    </div>
  )
}

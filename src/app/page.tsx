import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const service = createServiceClient()
  const { data } = await service
    .from('certificate_settings')
    .select('institution_name, logo_url')
    .limit(1)
    .single()

  const institutionName = data?.institution_name || 'PBK Management and Leadership Institute'
  const logoUrl = data?.logo_url ?? null

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                <img src={logoUrl} alt={institutionName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 6.075-4.925 11-11 11S1 18.075 1 12a12.08 12.08 0 012.84-7.757L12 14z" />
                </svg>
              </div>
            )}
            <span className="font-bold text-gray-900 text-lg">{institutionName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              Create account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 border border-white/20 text-blue-200 text-sm px-4 py-1.5 rounded-full mb-6 font-medium">
            Globally Accredited Programmes
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
            Advance your career with<br className="hidden sm:block" />
            <span className="text-blue-300"> {institutionName}</span>
          </h1>
          <p className="text-blue-100 text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
            Globally recognised qualifications delivered online. Study at your own pace with expert support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-blue-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Create account — then choose a programme
            </Link>
            <Link href="/login" className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm">
              Sign in to my account
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center justify-items-center">
          {[
            { value: 'NQF 4–10', label: 'Qualification levels' },
            { value: '100%', label: 'Online & in-person delivery' },
            { value: 'ZA & ZM', label: 'Recognised in South Africa & Zambia' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-blue-700">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Everything you need to succeed</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '📚', title: 'Structured Learning', desc: 'Sequential modules with formative quizzes, assignments, and final assessments.' },
              { icon: '🏆', title: 'Recognised Qualifications', desc: 'Earn globally recognised qualifications and certificates upon successful completion of your programme.' },
              { icon: '💳', title: 'Flexible Payments', desc: 'Pay your course fee in 3, 6, or 12 monthly instalments — whichever suits you best.' },
              { icon: '📱', title: 'Study Anywhere', desc: 'Access your course material from any device, any time.' },
              { icon: '👩‍🏫', title: 'Expert Lecturers', desc: 'Learn from qualified professionals with real-world industry experience.' },
              { icon: '📊', title: 'Progress Tracking', desc: 'Track your marks and progress through each module in real time.' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">Join {institutionName} and take the next step in your professional development.</p>
        <Link href="/register" className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
          Create account — then apply for a programme
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} {institutionName}. All rights reserved.
      </footer>
    </div>
  )
}

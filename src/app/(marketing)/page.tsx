import Image from 'next/image'
import Link from 'next/link'
import { getMarketingBranding } from '@/lib/marketing/branding'
import { CTABand } from '@/components/marketing/CTABand'
import { PartnerLogoMarquee } from '@/components/marketing/PartnerLogoMarquee'
import { INSTITUTE_MOTTO } from '@/lib/institute'

export default async function HomePage() {
  const { institutionName } = await getMarketingBranding()

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#041028] text-white py-24 px-4">
        <Image
          src="/hero-institute.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Navy scrim keeps the centred emblem visible and the light copy at WCAG AA. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(4,16,40,0.90),rgba(8,32,78,0.85)_48%,rgba(5,16,42,0.92))]"
        />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 border border-white/20 text-blue-200 text-sm px-4 py-1.5 rounded-full mb-6 font-medium">
            Globally Accredited Programmes
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
            Advance your career with
            <br className="hidden sm:block" />
            <span className="text-blue-300"> {institutionName}</span>
          </h1>
          <p className="text-blue-200 font-medium mb-3">{INSTITUTE_MOTTO}</p>
          <p className="text-blue-100 text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
            Certificate, Diploma and Advanced Diploma programmes across five schools, with Masters and PhD via Recognition of Prior Learning (RPL) for theology. Study full-time, part-time, in the evening, or by online distance learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply" className="bg-white text-blue-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Apply for a programme
            </Link>
            <Link href="/education" className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm">
              2027 prospectus
            </Link>
            <Link href="/login" className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm">
              Sign in to my account
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center justify-items-center">
          {[
            { value: '5 schools', label: 'Programmes grouped by school' },
            { value: 'Up to PhD', label: 'Certificate, Diploma and Advanced Diploma, and Masters and PhD via RPL for theology' },
            { value: '4 modes', label: 'Full-time, part-time, evening and online' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-blue-700">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Everything you need to succeed</h2>
          <p className="text-center text-gray-500 text-sm mb-12 max-w-2xl mx-auto">
            Learn more about our{' '}
            <Link href="/about" className="text-blue-700 hover:underline">mission</Link>,{' '}
            <Link href="/education" className="text-blue-700 hover:underline">programmes</Link>, and{' '}
            <Link href="/team" className="text-blue-700 hover:underline">leadership team</Link>.
          </p>
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

      <PartnerLogoMarquee />

      <CTABand institutionName={institutionName} />
    </>
  )
}

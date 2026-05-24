import type { Metadata } from 'next'
import { getMarketingBranding } from '@/lib/marketing/branding'
import { PageHero } from '@/components/marketing/PageHero'
import { CTABand } from '@/components/marketing/CTABand'
import { aboutSections } from '@/content/marketing'

export const metadata: Metadata = {
  title: 'About',
  description: 'Mission, values, and accreditation',
}

export default async function AboutPage() {
  const { institutionName } = await getMarketingBranding()

  return (
    <>
      <PageHero
        title="About us"
        subtitle={`${institutionName} is committed to developing ethical, capable leaders.`}
      />

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our mission</h2>
          <p className="text-gray-600 leading-relaxed">{aboutSections.mission}</p>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Accreditation & recognition</h2>
          <ul className="space-y-3">
            {aboutSections.accreditation.map(item => (
              <li key={item} className="flex gap-3 text-gray-600">
                <span className="text-blue-700 font-bold shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our values</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {aboutSections.values.map(v => (
              <div key={v.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand institutionName={institutionName} />
    </>
  )
}

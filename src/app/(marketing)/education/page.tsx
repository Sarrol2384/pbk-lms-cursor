import type { Metadata } from 'next'
import { PageHero } from '@/components/marketing/PageHero'
import { CTABand } from '@/components/marketing/CTABand'
import { NqfPathwayTable } from '@/components/marketing/NqfPathwayTable'
import { Prospectus } from '@/components/marketing/Prospectus'
import {
  nqfPathwayIntro,
  nqfPathwayRows,
  nqfProgressionNotes,
} from '@/content/marketing'
import { homepageAvailabilitySummary } from '@/content/application-availability'
import { INSTITUTE_MOTTO, INSTITUTE_NAME } from '@/lib/institute'
import { loadApplicationAvailability } from '@/lib/application-openings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '2027 Prospectus',
  description:
    '2027 prospectus for PBK Memorial Management and Leadership Institute. A qualification can be applied for only when applications for it are open.',
}

export default async function EducationPage() {
  const availability = await loadApplicationAvailability()
  const summary = homepageAvailabilitySummary(availability.openings)

  return (
    <>
      <PageHero
        title="2027 Prospectus"
        subtitle={`${INSTITUTE_NAME}. ${INSTITUTE_MOTTO}`}
      />

      <section className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 via-white to-white">
        <Prospectus openings={availability.openings} />
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-white via-blue-50 to-blue-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-blue-950 text-center mb-4">
            {nqfPathwayIntro.title}
          </h2>
          <div className="w-16 h-1 bg-blue-700 mx-auto rounded-full mb-6" aria-hidden />
          <p className="text-gray-600 text-sm sm:text-base text-center max-w-3xl mx-auto mb-4 leading-relaxed">
            {nqfPathwayIntro.body}
          </p>
          <p className="text-gray-600 text-sm text-center max-w-3xl mx-auto mb-10 leading-relaxed">
            The prospectus names Certificate, Diploma and Advanced Diploma study. Theology & Ministry also names Masters and PhD via Recognition of Prior Learning (RPL). A qualification can be selected on the application form only when it is open. The pathway below shows how a qualification can lead on to further study.
          </p>

          <NqfPathwayTable rows={nqfPathwayRows} />

          <div className="mt-12 bg-white rounded-xl border border-blue-100 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Key progression notes</h3>
            <ol className="space-y-3 list-decimal list-inside text-sm text-gray-600 leading-relaxed">
              {nqfProgressionNotes.map(note => (
                <li key={note} className="pl-1">
                  {note}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-blue-50 border-y border-blue-100">
        <div className="max-w-3xl mx-auto text-center text-sm text-gray-600">
          Fees are confirmed when your application is reviewed. Current students sign in to the portal to continue an enrolment.
        </div>
      </section>

      <CTABand
        institutionName={INSTITUTE_NAME}
        title={summary.ctaTitle}
        description={summary.ctaDescription}
        primaryLabel={summary.ctaLabel}
      />
    </>
  )
}

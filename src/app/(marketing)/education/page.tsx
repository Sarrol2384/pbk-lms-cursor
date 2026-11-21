import type { Metadata } from 'next'
import { PageHero } from '@/components/marketing/PageHero'
import { CTABand } from '@/components/marketing/CTABand'
import { StudyPathwayTable } from '@/components/marketing/StudyPathwayTable'
import { Prospectus } from '@/components/marketing/Prospectus'
import Link from 'next/link'
import {
  academicPathwayRows,
  studyPathwayIntro,
  studyProgressionNotes,
  theologyPathwayRows,
} from '@/content/marketing'
import { CHAPLAINCY_FEES, CHAPLAINCY_PATH, INSTALMENT_TERMS, RPL_REGISTRATION_USD, STANDARD_REGISTRATION_USD } from '@/content/programme-fees'
import { INSTITUTE_MOTTO, INSTITUTE_NAME } from '@/lib/institute'
import { formatUsd } from '@/lib/tuition'

export const metadata: Metadata = {
  title: '2027 Prospectus',
  description:
    "Certificate through Bachelor's programmes at PBK Memorial Management and Leadership Institute, with Master's and PhD via Recognition of Prior Learning (RPL) for theology. Fees are full totals in US dollars.",
}

export default function EducationPage() {
  return (
    <>
      <PageHero
        title="2027 Prospectus"
        subtitle={`${INSTITUTE_NAME}. ${INSTITUTE_MOTTO}`}
      />

      <section className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 via-white to-white">
        <Prospectus />
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-white via-blue-50 to-blue-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 id="academic-pathway" className="font-serif text-xl sm:text-2xl font-bold text-blue-950 text-center mb-4">
            {studyPathwayIntro.title}
          </h2>
          <div className="w-16 h-1 bg-blue-700 mx-auto rounded-full mb-6" aria-hidden />
          <p className="text-gray-600 text-sm sm:text-base text-center max-w-3xl mx-auto mb-4 leading-relaxed">
            {studyPathwayIntro.body}
          </p>
          <p className="text-gray-600 text-sm text-center max-w-3xl mx-auto mb-10 leading-relaxed">
            Academic programmes are listed from Certificate through Bachelor&apos;s. Theology & Ministry programmes also list Bachelor&apos;s, and Master&apos;s and PhD via Recognition of Prior Learning (RPL). RPL is not used from Certificate through Bachelor&apos;s.
          </p>

          <h3 className="text-lg font-bold text-blue-950 mb-4">Academic programmes</h3>
          <StudyPathwayTable caption="Academic programme fees and durations in US dollars" rows={academicPathwayRows} />

          <h3 className="text-lg font-bold text-blue-950 mt-10 mb-4">Theology & Ministry</h3>
          <StudyPathwayTable caption="Theology and ministry programme fees and durations in US dollars" rows={theologyPathwayRows} />

          <div className="mt-12 bg-white rounded-xl border border-blue-100 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Key progression notes</h3>
            <ol className="space-y-3 list-decimal list-inside text-sm text-gray-600 leading-relaxed">
              {studyProgressionNotes.map(note => (
                <li key={note} className="pl-1">
                  {note}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto bg-white border border-blue-100 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Chaplaincy</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            Designated, Certified, and Professional Chaplain are a separate pathway. Registration is {formatUsd(CHAPLAINCY_FEES.registrationUsd)} (one-off) and ACBC membership is {formatUsd(CHAPLAINCY_FEES.acbcMembershipUsd)} per year.
          </p>
          <p className="text-sm">
            <Link href={CHAPLAINCY_PATH} className="font-semibold text-blue-700 hover:underline">
              View chaplaincy levels and fees
            </Link>
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-blue-50 border-y border-blue-100">
        <div className="max-w-3xl mx-auto text-center text-sm text-gray-600 leading-relaxed">
          Programme fees above are the full totals in US dollars. Registration is {formatUsd(STANDARD_REGISTRATION_USD)} for academic and theology programmes other than Master&apos;s and PhD, and {formatUsd(RPL_REGISTRATION_USD)} for Master&apos;s and PhD (RPL). {INSTALMENT_TERMS} Current students sign in to the portal to continue an enrolment.
        </div>
      </section>

      <CTABand
        institutionName={INSTITUTE_NAME}
        title="Apply for a 2027 programme"
        description="Submit the public application form. You do not need an account."
        primaryLabel="Apply now"
      />
    </>
  )
}

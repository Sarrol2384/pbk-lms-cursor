import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PageHero } from '@/components/marketing/PageHero'
import { PaymentTerms } from '@/components/marketing/PaymentTerms'
import { CHAPLAINCY_IMAGES } from '@/content/chaplaincy-media'
import { CHAPLAINCY_LAUNCH_LABEL, CHAPLAINCY_LAUNCH_NOTE } from '@/content/events'
import { CHAPLAINCY_FEES } from '@/content/programme-fees'
import { INSTITUTE_NAME, supportEmail } from '@/lib/institute'
import { formatUsd } from '@/lib/tuition'

export const metadata: Metadata = {
  title: 'Chaplaincy',
  description:
    `Designated, Certified, and Professional Chaplain at PBK. The Chaplaincy launch is on ${CHAPLAINCY_LAUNCH_LABEL}. Fees are in US dollars.`,
}

export default function ChaplaincyPage() {
  const email = supportEmail()

  return (
    <>
      <PageHero
        title="Chaplaincy"
        subtitle={`${INSTITUTE_NAME}. Globally accredited chaplaincy levels, with fees in US dollars.`}
      />

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-4 text-gray-600 leading-relaxed">
          <p>
            These levels are Designated Chaplain, Certified Chaplain, and Professional Chaplain. They are separate from the Theology & Ministry Chaplaincy qualification in the prospectus.
          </p>
          <p>
            PBK programmes are globally accredited. They are not registered with the South African Qualifications Authority (SAQA). Grade 12 (NQF 4) in the table is the applicant&apos;s school qualification.
          </p>
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-950">
            {CHAPLAINCY_LAUNCH_NOTE}
          </p>
        </div>
        <ul className="max-w-5xl mx-auto mt-10 grid gap-4 sm:grid-cols-3">
          {CHAPLAINCY_IMAGES.map(image => (
            <li key={image.src} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(min-width: 640px) 33vw, 100vw"
                className="h-52 w-full object-cover"
              />
            </li>
          ))}
        </ul>
        <p className="max-w-5xl mx-auto text-xs text-gray-500 mt-3">
          Photographs from{' '}
          <a href="https://unsplash.com/license" className="underline hover:text-gray-700">
            Unsplash
          </a>
          . The Unsplash Licence does not require attribution.
        </p>
      </section>

      <section id="fees" className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Chaplaincy fees</h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-3xl mb-3">
            Amounts are in US dollars. Registration is {formatUsd(CHAPLAINCY_FEES.registrationUsd)} and is paid once. ACBC membership is {formatUsd(CHAPLAINCY_FEES.acbcMembershipUsd)} per year.
          </p>
          <PaymentTerms className="text-sm text-gray-700 leading-relaxed max-w-3xl mb-8" />

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-blue-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Registration</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatUsd(CHAPLAINCY_FEES.registrationUsd)}</p>
              <p className="text-sm text-gray-600 mt-1">One-off</p>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">ACBC membership</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatUsd(CHAPLAINCY_FEES.acbcMembershipUsd)}</p>
              <p className="text-sm text-gray-600 mt-1">Per year</p>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto bg-white border border-blue-100 rounded-xl">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Chaplaincy levels, entry requirements, duration, and fees in US dollars</caption>
              <thead className="bg-blue-50 text-blue-950">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Level</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Entry requirement</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Duration</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Fee</th>
                </tr>
              </thead>
              <tbody>
                {CHAPLAINCY_FEES.levels.map(level => (
                  <tr key={level.id} className="border-t border-blue-50">
                    <th scope="row" className="px-4 py-3 font-medium text-gray-900 text-left">{level.name}</th>
                    <td className="px-4 py-3 text-gray-700">{level.entryRequirement}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {level.duration ?? 'Not stated'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatUsd(level.feeUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {CHAPLAINCY_FEES.levels.map(level => (
              <article key={level.id} className="bg-white rounded-xl border border-blue-100 p-5">
                <h3 className="font-semibold text-gray-900">{level.name}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-blue-800">Entry requirement</dt>
                    <dd className="text-gray-700 mt-0.5">{level.entryRequirement}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-blue-800">Duration</dt>
                    <dd className="text-gray-700 mt-0.5">{level.duration ?? 'Not stated'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-blue-800">Fee</dt>
                    <dd className="text-gray-900 font-medium mt-0.5">{formatUsd(level.feeUsd)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-700 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Apply or contact PBK</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
          To apply for Designated, Certified, or Professional Chaplain, contact {INSTITUTE_NAME}. The admissions team will confirm your level and the fees above.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm"
          >
            Apply
          </Link>
          <a
            href={`mailto:${email}`}
            className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            Email {email}
          </a>
        </div>
        <p className="text-sm text-blue-100 mt-6">
          <Link href="/contact" className="underline hover:text-white">Contact page</Link>
          {' · '}
          <Link href="/education" className="underline hover:text-white">Prospectus</Link>
        </p>
      </section>
    </>
  )
}

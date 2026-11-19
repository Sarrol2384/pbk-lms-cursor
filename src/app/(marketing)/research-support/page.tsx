import type { Metadata } from 'next'
import Link from 'next/link'
import { IndagationFees } from '@/components/marketing/IndagationFees'
import {
  INDAGATION_META_DESCRIPTION,
  INDAGATION_PARTNERSHIP,
  INDAGATION_PATH,
  INDAGATION_WHATSAPP_LINK,
} from '@/content/indagation'
import { FACEBOOK_PAGE_URL } from '@/content/social'
import { INSTITUTE_NAME } from '@/lib/institute'
import { siteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: 'Research support',
  description: INDAGATION_META_DESCRIPTION,
  alternates: { canonical: INDAGATION_PATH },
  openGraph: {
    title: INDAGATION_PARTNERSHIP.heading,
    description: INDAGATION_META_DESCRIPTION,
    url: INDAGATION_PATH,
    type: 'website',
    locale: 'en_ZA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Research support with The Indagation Institute',
    description: INDAGATION_META_DESCRIPTION,
  },
}

export default function ResearchSupportPage() {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: INDAGATION_PARTNERSHIP.heading,
    description: INDAGATION_META_DESCRIPTION,
    url: `${siteUrl()}${INDAGATION_PATH}`,
    inLanguage: 'en-ZA',
    publisher: {
      '@type': 'Organization',
      name: INSTITUTE_NAME,
      url: siteUrl(),
      sameAs: [FACEBOOK_PAGE_URL],
    },
    about: {
      '@type': 'Organization',
      name: 'The Indagation Institute',
      email: INDAGATION_PARTNERSHIP.email,
      telephone: '+260766100934',
      slogan: INDAGATION_PARTNERSHIP.slogan,
    },
  }).replace(/</g, '\\u003c')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-14 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-3">Research support</p>
          <h1 className="text-2xl sm:text-4xl font-bold mb-4 leading-tight text-balance">
            {INDAGATION_PARTNERSHIP.heading}
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto">{INDAGATION_PARTNERSHIP.tagline}</p>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About the partnership</h2>
          <blockquote className="border-l-4 border-blue-700 pl-4 sm:pl-5">
            <p className="text-gray-600 leading-relaxed">{INDAGATION_PARTNERSHIP.about}</p>
            <footer className="mt-3 text-sm text-gray-500">The Indagation Institute, on its partnership with PBK.</footer>
          </blockquote>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {INDAGATION_PARTNERSHIP.services.map(service => (
              <li key={service} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">{service}</h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="fees" className="py-12 sm:py-16 px-4 sm:px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Service fees</h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-3xl mb-8">
            All fees are in US dollars. These are Indagation Institute service fees. They are separate from PBK programme fees.
          </p>
          <IndagationFees />
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{INDAGATION_PARTNERSHIP.benefitsTitle}</h2>
          <ul className="space-y-3">
            {INDAGATION_PARTNERSHIP.benefits.map(benefit => (
              <li key={benefit} className="flex gap-3 text-gray-600">
                <span className="text-blue-700 font-bold shrink-0" aria-hidden="true">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="py-12 sm:py-16 px-4 sm:px-6 scroll-mt-32">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact The Indagation Institute</h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
            Ask The Indagation Institute about research support, training and consultancy.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href={`mailto:${INDAGATION_PARTNERSHIP.email}`}
              className="rounded-xl border border-gray-200 p-5 hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Email</p>
              <p className="font-medium text-gray-900 mt-2 break-all">{INDAGATION_PARTNERSHIP.email}</p>
            </a>
            <a
              {...INDAGATION_WHATSAPP_LINK}
              className="rounded-xl border border-gray-200 p-5 hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">WhatsApp</p>
              <p className="font-medium text-gray-900 mt-2">{INDAGATION_PARTNERSHIP.whatsAppDisplay}</p>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 bg-blue-50 border-y border-blue-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-serif text-xl sm:text-2xl text-blue-950">{INDAGATION_PARTNERSHIP.slogan}</p>
          <p className="text-sm text-gray-600 mt-6">
            Looking for a PBK programme?{' '}
            <Link href="/education" className="font-medium text-blue-700 hover:underline">
              View the prospectus
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}

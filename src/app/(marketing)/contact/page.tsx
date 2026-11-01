import type { Metadata } from 'next'
import { PageHero } from '@/components/marketing/PageHero'
import { ContactForm } from '@/components/marketing/ContactForm'
import { HotlineLink } from '@/components/marketing/HotlineLink'
import { INSTITUTE_NAME, supportEmail } from '@/lib/institute'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact ${INSTITUTE_NAME} with a question about programmes, applications or study.`,
}

export default function ContactPage() {
  const email = supportEmail()

  return (
    <>
      <PageHero
        title="Contact"
        subtitle="Send a question and we will reply by email. You do not need an account."
      />
      <section className="py-12 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 text-center shadow-sm">
            <HotlineLink className="inline-flex items-center justify-center min-h-11 text-lg font-semibold text-blue-800 hover:underline" />
            <p className="text-sm text-gray-600 mt-1">
              Or email us directly at{' '}
              <a href={`mailto:${email}`} className="text-blue-700 hover:underline">{email}</a>.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  )
}

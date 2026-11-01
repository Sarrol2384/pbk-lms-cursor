import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/marketing/PageHero'
import { PublicApplicationForm } from '@/components/marketing/PublicApplicationForm'
import { findProgramme, programmeOffersRpl } from '@/content/prospectus'
import { supportEmail } from '@/lib/institute'

export const metadata: Metadata = {
  title: 'Apply',
  description: 'Apply for a 2027 prospectus programme at PBK Memorial Management and Leadership Institute. No account is required.',
}

export default function ApplyPage({ searchParams }: { searchParams: { programme?: string } }) {
  const programme = findProgramme(searchParams.programme || '')
  const email = supportEmail()

  return (
    <>
      <PageHero
        title="Apply"
        subtitle={programme
          ? programmeOffersRpl(programme.programme)
            ? `Apply for ${programme.programme.name}. Recognition of Prior Learning (RPL) applies only to Masters and PhD. You do not need an account.`
            : `Apply for ${programme.programme.name}. You do not need an account.`
          : 'Submit a prospectus application. You do not need an account.'}
      />
      <section className="py-12 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-6">
          <PublicApplicationForm initialProgrammeId={programme?.programme.id} />
          <p className="text-sm text-gray-500 text-center">
            Already a student?{' '}
            <Link href="/login" className="text-blue-700 hover:underline">Sign in</Link>
            {' '}to continue an enrolment. Questions:{' '}
            <a href={`mailto:${email}`} className="text-blue-700 hover:underline">{email}</a>
          </p>
        </div>
      </section>
    </>
  )
}

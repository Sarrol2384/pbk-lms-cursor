import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/marketing/PageHero'
import { PublicApplicationForm } from '@/components/marketing/PublicApplicationForm'
import { applyHeroSubtitle } from '@/content/application-availability'
import { supportEmail } from '@/lib/institute'
import { loadApplicationAvailability } from '@/lib/application-openings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Apply',
  description: 'Apply for a 2027 prospectus programme at PBK Memorial Management and Leadership Institute. No account is required.',
}

export default async function ApplyPage({ searchParams }: { searchParams: { programme?: string } }) {
  const email = supportEmail()
  const availability = await loadApplicationAvailability()
  const openingKey = availability.openings.map(item => `${item.programmeId}:${item.levels.join('+')}`).join('|')

  return (
    <>
      <PageHero
        title="Apply"
        subtitle={applyHeroSubtitle(searchParams.programme, availability.openings)}
      />
      <section className="py-12 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-6">
          <PublicApplicationForm
            key={`${searchParams.programme || 'none'}:${openingKey}`}
            initialProgrammeId={searchParams.programme}
            openings={availability.openings}
          />
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

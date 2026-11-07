import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/marketing/PageHero'
import { PublicApplicationForm } from '@/components/marketing/PublicApplicationForm'
import { applyHeroSubtitle } from '@/content/application-availability'
import { supportEmail } from '@/lib/institute'

export const metadata: Metadata = {
  title: 'Apply',
  description: 'Apply for a 2027 prospectus programme at PBK Memorial Management and Leadership Institute. No account is required.',
}

export default function ApplyPage({ searchParams }: { searchParams: { programme?: string } }) {
  const email = supportEmail()

  return (
    <>
      <PageHero
        title="Apply"
        subtitle={applyHeroSubtitle(searchParams.programme)}
      />
      <section className="py-12 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-6">
          <PublicApplicationForm key={searchParams.programme || 'none'} initialProgrammeId={searchParams.programme} />
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

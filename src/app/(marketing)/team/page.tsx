import type { Metadata } from 'next'
import { getMarketingBranding } from '@/lib/marketing/branding'
import { CTABand } from '@/components/marketing/CTABand'
import { TeamMemberCard } from '@/components/marketing/TeamMemberCard'
import { teamMembers } from '@/content/marketing'

export const metadata: Metadata = {
  title: 'Our Team',
  description: 'Meet the executive leadership team',
}

export default async function TeamPage() {
  const { institutionName } = await getMarketingBranding()

  return (
    <>
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide uppercase">
            Executive Team
          </h1>
          <div className="w-16 h-1 bg-blue-300 mx-auto mt-4 rounded-full" aria-hidden />
          <p className="text-blue-100 text-sm mt-6 max-w-2xl mx-auto">
            Leadership dedicated to values-based education and professional development at {institutionName}.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-blue-50 via-white to-blue-50/80">
        <div className="max-w-[90rem] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {teamMembers.map(member => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      <CTABand institutionName={institutionName} />
    </>
  )
}

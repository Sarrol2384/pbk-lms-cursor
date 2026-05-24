import type { Metadata } from 'next'
import { getMarketingBranding } from '@/lib/marketing/branding'
import { PageHero } from '@/components/marketing/PageHero'
import { CTABand } from '@/components/marketing/CTABand'
import { NqfPathwayTable } from '@/components/marketing/NqfPathwayTable'
import {
  educationProgrammes,
  nqfPathwayIntro,
  nqfPathwayRows,
  nqfProgressionNotes,
} from '@/content/marketing'

export const metadata: Metadata = {
  title: 'Education',
  description:
    'NQF Levels 1–10 academic pathway, programmes, delivery options, and flexible study at PBK Memorial Management and Leadership Institute.',
}

export default async function EducationPage() {
  const { institutionName } = await getMarketingBranding()

  return (
    <>
      <PageHero
        title="Education"
        subtitle="From your first qualification through to doctoral study — follow a clear NQF pathway with flexible online delivery."
      />

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-blue-50 via-white to-blue-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-blue-950 text-center mb-4">
            {nqfPathwayIntro.title}
          </h2>
          <div className="w-16 h-1 bg-blue-700 mx-auto rounded-full mb-6" aria-hidden />
          <p className="text-gray-600 text-sm sm:text-base text-center max-w-3xl mx-auto mb-10 leading-relaxed">
            {nqfPathwayIntro.body}
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

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Study with {institutionName}</h2>
          {educationProgrammes.map(prog => (
            <div key={prog.title} className="bg-white rounded-xl border border-blue-100 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{prog.title}</h3>
              <p className="text-sm text-blue-700 font-medium mb-1">{prog.levels}</p>
              <p className="text-sm text-gray-500 mb-6">{prog.delivery}</p>
              <ul className="space-y-2">
                {prog.highlights.map(h => (
                  <li key={h} className="flex gap-3 text-sm text-gray-600">
                    <span className="text-blue-700 shrink-0">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-4 bg-blue-50 border-y border-blue-100">
        <div className="max-w-3xl mx-auto text-center text-sm text-gray-600">
          Programme availability and fees are confirmed when you apply. After creating an account, you can browse and enrol in published programmes through the student portal.
        </div>
      </section>

      <CTABand
        institutionName={institutionName}
        title="Start your learning journey"
        description="Create an account and apply for the programme that matches your career goals."
        primaryLabel="Apply now"
      />
    </>
  )
}

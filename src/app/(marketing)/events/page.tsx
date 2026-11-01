import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { events } from '@/content/events'
import { PageHero } from '@/components/marketing/PageHero'
import { EventCard } from '@/components/marketing/EventCard'
import { CTABand } from '@/components/marketing/CTABand'
import { getMarketingBranding } from '@/lib/marketing/branding'
import { partitionEvents } from '@/lib/events'
import { INSTITUTE_NAME } from '@/lib/institute'
import { siteUrl } from '@/lib/site-url'

const description = `Upcoming and past events at the ${INSTITUTE_NAME}.`

export function generateMetadata(): Metadata {
  noStore()
  const { upcoming, past } = partitionEvents(events, new Date())
  const featured = upcoming[0] ?? past[0]

  return {
    metadataBase: new URL(siteUrl()),
    title: 'Events',
    description,
    alternates: { canonical: '/events' },
    openGraph: {
      title: 'Events',
      description,
      url: '/events',
      type: 'website',
      locale: 'en_ZA',
      images: featured
        ? [
            {
              url: featured.coverImage,
              width: featured.coverWidth,
              height: featured.coverHeight,
              alt: featured.coverImageAlt,
            },
          ]
        : undefined,
    },
  }
}

export default async function EventsPage() {
  noStore()
  const { institutionName } = await getMarketingBranding()
  const { upcoming, past } = partitionEvents(events, new Date())

  return (
    <>
      <PageHero title="Events" subtitle="Graduations, ceremonies and gatherings at the institute." />

      <section className="py-12 sm:py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-600">There are no upcoming events at the moment.</p>
            ) : (
              <ul className="space-y-6">
                {upcoming.map(event => (
                  <li key={event.slug}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Past</h2>
            {past.length === 0 ? (
              <p className="text-gray-600">There are no past events yet.</p>
            ) : (
              <ul className="space-y-6">
                {past.map(event => (
                  <li key={event.slug}>
                    <EventCard event={event} past />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <CTABand institutionName={institutionName} />
    </>
  )
}

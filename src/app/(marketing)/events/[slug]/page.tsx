import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { events } from '@/content/events'
import { EventPoster } from '@/components/marketing/EventPoster'
import { CTABand } from '@/components/marketing/CTABand'
import { getMarketingBranding } from '@/lib/marketing/branding'
import {
  eventJsonLd,
  eventMetaDescription,
  eventPagePath,
  eventParagraphs,
  formatEventWhen,
  getEventBySlug,
  isPastEvent,
} from '@/lib/events'
import { siteUrl } from '@/lib/site-url'

type EventPageProps = {
  params: { slug: string }
}

export function generateStaticParams() {
  return events.map(event => ({ slug: event.slug }))
}

export function generateMetadata({ params }: EventPageProps): Metadata {
  const event = getEventBySlug(params.slug)
  if (!event) return { title: 'Event' }

  const description = eventMetaDescription(event)
  const path = eventPagePath(event)

  return {
    metadataBase: new URL(siteUrl()),
    title: event.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: event.title,
      description,
      url: path,
      type: 'website',
      locale: 'en_ZA',
      images: [
        {
          url: event.coverImage,
          width: event.coverWidth,
          height: event.coverHeight,
          alt: event.coverImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: [event.coverImage],
    },
  }
}

export default async function EventDetailPage({ params }: EventPageProps) {
  noStore()
  const event = getEventBySlug(params.slug)
  if (!event) notFound()

  const { institutionName } = await getMarketingBranding()
  const when = formatEventWhen(event.start)
  const past = isPastEvent(event, new Date())
  const jsonLd = JSON.stringify(eventJsonLd(event)).replace(/</g, '\\u003c')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-14 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/events" className="text-sm font-medium text-blue-200 hover:text-white">
            Events
          </Link>
          {past ? (
            <p className="mt-5 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              Past event
            </p>
          ) : null}
          <h1 className={`text-3xl sm:text-5xl font-bold leading-tight ${past ? 'mt-4' : 'mt-5'}`}>{event.title}</h1>
          <p className="mt-4 font-serif italic text-xl sm:text-2xl text-amber-200">{event.tagline}</p>
          <dl className="mt-8 flex flex-col sm:flex-row gap-6 sm:gap-14">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">Date</dt>
              <dd className="mt-1 text-lg font-medium">{when}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">Venue</dt>
              <dd className="mt-1 text-lg font-medium">{event.venue}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-2 order-2 lg:order-1 space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About this event</h2>
              <div className="space-y-4">
                {eventParagraphs(event.description).map(paragraph => (
                  <p key={paragraph} className="text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {event.values.length > 0 ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Values</h2>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {event.values.map(value => (
                    <li key={value.title} className="rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900">{value.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed mt-2">{value.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-24 space-y-5">
            {event.posterImage && event.posterImageAlt && event.posterWidth && event.posterHeight ? (
              <EventPoster
                src={event.posterImage}
                alt={event.posterImageAlt}
                width={event.posterWidth}
                height={event.posterHeight}
              />
            ) : null}
            <a
              href={`${eventPagePath(event)}/event.ics`}
              className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Add to calendar
            </a>
            <p className="text-sm text-gray-600 text-center">
              For enquiries, email{' '}
              <a href={`mailto:${event.contactEmail}`} className="font-medium text-blue-700 hover:underline">
                {event.contactEmail}
              </a>
              .
            </p>
          </aside>
        </div>
      </section>

      <CTABand institutionName={institutionName} />
    </>
  )
}

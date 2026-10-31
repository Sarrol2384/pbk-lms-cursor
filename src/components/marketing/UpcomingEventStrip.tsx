import Link from 'next/link'
import type { InstituteEvent } from '@/content/events'
import { eventPagePath, formatEventWhen } from '@/lib/events'

export function UpcomingEventStrip({ event }: { event: InstituteEvent }) {
  const when = formatEventWhen(event.start)

  return (
    <section aria-labelledby="upcoming-events-heading" className="bg-blue-50 border-b border-blue-100">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <h2 id="upcoming-events-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">
            Upcoming events
          </h2>
          <Link href="/events" className="text-sm font-semibold text-blue-700 hover:underline shrink-0">
            All events
          </Link>
        </div>
        <article className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          <Link
            href={eventPagePath(event)}
            className="group grid sm:grid-cols-[18rem_1fr] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <div className="relative h-56 sm:h-full min-h-52 bg-blue-100">
              <img
                src={event.coverImage}
                alt={event.coverImageAlt}
                width={event.coverWidth}
                height={event.coverHeight}
                className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
                decoding="async"
              />
            </div>
            <div className="p-6 sm:p-8 flex flex-col justify-center">
              <p className="text-sm font-semibold text-blue-700">{when}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 group-hover:text-blue-800">
                {event.title}
              </h3>
              <p className="text-gray-600 mt-2">{event.tagline}</p>
              <p className="text-sm text-gray-500 mt-3">{event.venue}</p>
              <span className="mt-5 text-sm font-semibold text-blue-700">View event</span>
            </div>
          </Link>
        </article>
      </div>
    </section>
  )
}

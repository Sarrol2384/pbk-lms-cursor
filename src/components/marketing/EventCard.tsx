import Link from 'next/link'
import type { InstituteEvent } from '@/content/events'
import { eventPagePath, formatEventWhen } from '@/lib/events'

export function EventCard({ event, past = false }: { event: InstituteEvent; past?: boolean }) {
  const when = formatEventWhen(event.start)

  return (
    <article className={`rounded-2xl border bg-white overflow-hidden shadow-sm transition hover:shadow-md ${past ? 'border-gray-200' : 'border-blue-100 hover:border-blue-300'}`}>
      <Link href={eventPagePath(event)} className="group grid sm:grid-cols-[16rem_1fr] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        <div className="relative h-52 sm:h-full min-h-48 bg-blue-50">
          <img
            src={event.coverImage}
            alt={event.coverImageAlt}
            width={event.coverWidth}
            height={event.coverHeight}
            className="absolute inset-0 h-full w-full object-cover"
            loading={past ? 'lazy' : 'eager'}
            decoding="async"
          />
        </div>
        <div className="p-5 sm:p-6 flex flex-col justify-center">
          {past ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Past event</p>
          ) : null}
          <p className="text-sm font-semibold text-blue-700">{when}</p>
          <h3 className="text-xl font-bold text-gray-900 mt-1 group-hover:text-blue-800">{event.title}</h3>
          <p className="text-gray-600 mt-2">{event.tagline}</p>
          <p className="text-sm text-gray-500 mt-3">{event.venue}</p>
          <span className="mt-4 text-sm font-semibold text-blue-700">View event</span>
        </div>
      </Link>
    </article>
  )
}

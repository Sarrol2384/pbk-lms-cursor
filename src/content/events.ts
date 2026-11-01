import { INSTITUTE_EMAIL } from '@/lib/institute'

export type EventValue = {
  title: string
  description: string
}

/**
 * A public event. Add an object to `events` — nothing is stored in a database.
 * Upcoming versus past is decided from the South African calendar date of `start`:
 * the event stays upcoming through that date and moves to past the following day.
 * Pages show the date and time only (for example "12 December 2026, 9am"), never the weekday.
 */
export type InstituteEvent = {
  slug: string
  title: string
  tagline: string
  /** ISO 8601 start, with a South African offset (+02:00). */
  start: string
  venue: string
  /** Town, used in Event structured data. */
  locality?: string
  /** Province or region, used in Event structured data. */
  region?: string
  /** ISO country code, used in Event structured data. */
  country?: string
  /** Paragraphs separated by a blank line. */
  description: string
  values: EventValue[]
  coverImage: string
  coverImageAlt: string
  coverWidth: number
  coverHeight: number
  posterImage?: string
  posterImageAlt?: string
  posterWidth?: number
  posterHeight?: number
  contactEmail: string
}

export const events: InstituteEvent[] = [
  {
    slug: 'class-of-2026-graduation-ceremony',
    title: 'Class of 2026 Graduation Ceremony',
    tagline: 'Honouring today. Empowering tomorrow.',
    start: '2026-12-12T09:00:00+02:00',
    venue: 'Durbanville Civic Centre',
    locality: 'Durbanville',
    region: 'Western Cape',
    country: 'ZA',
    description: [
      'Education is more than knowledge, it is empowerment, purpose and the foundation of true leadership.',
      'As we celebrate this milestone, we recognise the dedication, resilience and growth that have shaped our graduates into leaders who will inspire change and build a better world.',
    ].join('\n\n'),
    values: [
      {
        title: 'Knowledge',
        description: 'The foundation that opens every door.',
      },
      {
        title: 'Leadership',
        description: 'The courage to lead with vision and integrity.',
      },
      {
        title: 'Service',
        description: 'The commitment to uplift others and create lasting impact.',
      },
      {
        title: 'Legacy',
        description: 'The difference you make that lives on.',
      },
    ],
    coverImage: '/events/class-of-2026-graduation-cover.webp',
    coverImageAlt: 'Graduates in black and blue academic dress holding their certificates aloft',
    coverWidth: 940,
    coverHeight: 788,
    posterImage: '/events/class-of-2026-graduation-poster.webp',
    posterImageAlt:
      'Poster for the Class of 2026 Graduation Ceremony on 12 December 2026 at the Durbanville Civic Centre',
    posterWidth: 904,
    posterHeight: 1280,
    contactEmail: INSTITUTE_EMAIL,
  },
]

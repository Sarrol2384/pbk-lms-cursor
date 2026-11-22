import { INSTITUTE_EMAIL } from '@/lib/institute'

export type EventValue = {
  title: string
  description: string
}

/**
 * A public event. Add an object to `events` — nothing is stored in a database.
 * Upcoming versus past is decided from the South African calendar date of `start`:
 * the event stays upcoming through that date and moves to past the following day.
 * Pages show the date and time only (for example "3 April 2027, 9am"), never the weekday.
 * 3 April 2027 is a Saturday and 4 April 2027 is a Sunday. Those weekdays are not printed.
 */
export const GRADUATION_START = '2027-04-03T09:00:00+02:00'
export const CHAPLAINCY_LAUNCH_LABEL = '4 April 2027'
export const CHAPLAINCY_LAUNCH_NOTE =
  'The Chaplaincy launch is on 4 April 2027, the day after graduation. Venue to be confirmed. The time is not confirmed.'
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
  /** Short line shown with the event listing, such as a following day's launch. */
  notice?: string
}

export const events: InstituteEvent[] = [
  {
    slug: 'class-of-2026-graduation-ceremony',
    title: 'Class of 2026 Graduation Ceremony',
    tagline: 'Honouring today. Empowering tomorrow.',
    start: GRADUATION_START,
    venue: 'Durbanville Civic Centre',
    locality: 'Durbanville',
    region: 'Western Cape',
    country: 'ZA',
    description: [
      'Education is more than knowledge, it is empowerment, purpose and the foundation of true leadership.',
      'As we celebrate this milestone, we recognise the dedication, resilience and growth that have shaped our graduates into leaders who will inspire change and build a better world.',
      CHAPLAINCY_LAUNCH_NOTE,
    ].join('\n\n'),
    notice: CHAPLAINCY_LAUNCH_NOTE,
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
    // The printed poster still says 12 December 2026, so it is not shown.
    contactEmail: INSTITUTE_EMAIL,
  },
]

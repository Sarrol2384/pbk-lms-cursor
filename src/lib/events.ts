import type { InstituteEvent } from '@/content/events'
import { events } from '@/content/events'
import { INSTITUTE_HOTLINE_SCHEMA, INSTITUTE_NAME } from '@/lib/institute'
import { siteUrl } from '@/lib/site-url'

export const SA_TIMEZONE = 'Africa/Johannesburg'

/**
 * The poster states a start time only. One hour stops calendar apps treating the
 * entry as zero-length. The public pages still show the start time alone.
 */
const CALENDAR_DURATION = 'PT1H'

export function getEventBySlug(slug: string): InstituteEvent | undefined {
  return events.find(event => event.slug === slug)
}

export function eventParagraphs(description: string): string[] {
  return description
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
}

/** Calendar date in South Africa, as YYYY-MM-DD, for ordering and comparisons. */
export function saCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** True once the South African calendar date is after the event date. */
export function isPastEvent(event: InstituteEvent, now: Date): boolean {
  return saCalendarDate(new Date(event.start)) < saCalendarDate(now)
}

export function partitionEvents(list: readonly InstituteEvent[], now: Date) {
  const upcoming: InstituteEvent[] = []
  const past: InstituteEvent[] = []

  for (const event of list) {
    if (isPastEvent(event, now)) past.push(event)
    else upcoming.push(event)
  }

  upcoming.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  past.sort((a, b) => Date.parse(b.start) - Date.parse(a.start))

  return { upcoming, past }
}

export function nextUpcomingEvent(list: readonly InstituteEvent[], now: Date): InstituteEvent | null {
  return partitionEvents(list, now).upcoming[0] ?? null
}

/** South African English date and time, without the weekday. On the hour: "12 December 2026, 9am". */
export function formatEventWhen(iso: string): string {
  const date = new Date(iso)
  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: SA_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).formatToParts(date)

  const hour = parts.find(part => part.type === 'hour')?.value ?? ''
  const minute = parts.find(part => part.type === 'minute')?.value ?? '00'
  const period = (parts.find(part => part.type === 'dayPeriod')?.value ?? 'am').toLowerCase()
  const suffix = period.startsWith('p') ? 'pm' : 'am'
  const time = minute === '00' ? `${hour}${suffix}` : `${hour}:${minute}${suffix}`

  return `${datePart}, ${time}`
}

export function eventMetaDescription(event: InstituteEvent): string {
  return `${event.tagline} ${event.title} on ${formatEventWhen(event.start)} at ${event.venue}.`
}

export function eventPagePath(event: InstituteEvent): string {
  return `/events/${event.slug}`
}

export function eventJsonLd(event: InstituteEvent) {
  const origin = siteUrl()
  const pageUrl = `${origin}${eventPagePath(event)}`
  const images = [event.coverImage, event.posterImage]
    .filter((src): src is string => Boolean(src))
    .map(src => `${origin}${src}`)

  const address: Record<string, string> = { '@type': 'PostalAddress' }
  if (event.locality) address.addressLocality = event.locality
  if (event.region) address.addressRegion = event.region
  if (event.country) address.addressCountry = event.country

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: `${event.tagline} ${event.description.replace(/\s+/g, ' ').trim()}`,
    startDate: event.start,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: 'en-ZA',
    image: images,
    url: pageUrl,
    location: {
      '@type': 'Place',
      name: event.venue,
      ...(Object.keys(address).length > 1 ? { address } : {}),
    },
    organizer: {
      '@type': 'EducationalOrganization',
      name: INSTITUTE_NAME,
      email: event.contactEmail,
      telephone: INSTITUTE_HOTLINE_SCHEMA,
      url: origin,
    },
  }
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function foldLine(line: string): string {
  const max = 75
  if (line.length <= max) return line

  const chunks: string[] = [line.slice(0, max)]
  let index = max
  while (index < line.length) {
    const next = line.slice(index, index + max - 1)
    chunks.push(` ${next}`)
    index += max - 1
  }
  return chunks.join('\r\n')
}

function formatUtcStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

function formatIcsLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '00'
  const pad = (value: string) => value.padStart(2, '0')
  return `${get('year')}${pad(get('month'))}${pad(get('day'))}T${pad(get('hour'))}${pad(get('minute'))}${pad(get('second'))}`
}

export function buildEventIcs(event: InstituteEvent, now = new Date()): string {
  const description = [
    event.tagline,
    '',
    event.description,
    '',
    `Venue: ${event.venue}`,
    `Enquiries: ${event.contactEmail}`,
  ].join('\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PBK Memorial Management and Leadership Institute//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Africa/Johannesburg',
    'X-LIC-LOCATION:Africa/Johannesburg',
    'BEGIN:STANDARD',
    'TZNAME:SAST',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0200',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${event.slug}@pbkleadership.org.za`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART;TZID=Africa/Johannesburg:${formatIcsLocal(event.start)}`,
    `DURATION:${CALENDAR_DURATION}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(event.venue)}`,
    `ORGANIZER;CN=${INSTITUTE_NAME}:mailto:${event.contactEmail}`,
    `URL:${siteUrl()}${eventPagePath(event)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

import { buildEventIcs, getEventBySlug } from '@/lib/events'

type IcsRouteProps = {
  params: { slug: string }
}

export function GET(_request: Request, { params }: IcsRouteProps) {
  const event = getEventBySlug(params.slug)
  if (!event) {
    return new Response('Event not found', { status: 404 })
  }

  return new Response(buildEventIcs(event), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'no-cache',
    },
  })
}

import { NextResponse } from 'next/server'
import { getSaptServerConfig, isSaptConfigured } from '@/lib/sapt-config'
import { ingestObject } from '@/lib/sapt-server'

/**
 * POST /api/book
 *
 * Saves a completed booking to the Sapt CRM as a record of your `booking`
 * object type (POST → CRM). Public — needs only the Project ID.
 *
 * The `booking` type must exist in your project with `isPublicIngestable: true`
 * before this works. Create it once (one call on the Sapt MCP, or by hand — see
 * SAPT_SETUP_GUIDE.md). Until then this returns a clear error so you know to set
 * it up, rather than silently dropping the booking.
 */

interface BookingBody {
  name?: string
  email?: string
  phone?: string
  service?: string
  serviceName?: string
  date?: string // ISO date the visitor requested
  time?: string // human label, e.g. "2:00 PM"
  visitorId?: string
  utm?: Record<string, string>
}

export async function POST(request: Request) {
  if (!isSaptConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Sapt is not configured (missing Project ID).' },
      { status: 503 }
    )
  }

  let body: BookingBody
  try {
    body = (await request.json()) as BookingBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim()
  const name = body.name?.trim()
  if (!email || !name) {
    return NextResponse.json(
      { ok: false, error: 'Name and email are required.' },
      { status: 400 }
    )
  }

  const { bookingTypeSlug } = getSaptServerConfig()
  const booking = await ingestObject(bookingTypeSlug, {
    externalId: `booking:${email}:${body.date ?? ''}:${body.time ?? ''}`,
    data: {
      name,
      email,
      phone: body.phone,
      service: body.serviceName || body.service,
      preferredDate: body.date,
      preferredTime: body.time,
      // `status` targets a Sapt SELECT field. Its choices MUST be stored as
      // {id,slug,label} objects in the project (slug = the value sent here),
      // or Sapt rejects every submit with "Unknown choice". See SAPT_SETUP_GUIDE.md.
      status: 'new',
      source: 'booking_funnel',
      ...(body.visitorId ? { saptVisitorId: body.visitorId } : {}),
      ...(body.utm ?? {}),
    },
  })

  if (!booking.ok) {
    // Most common cause: the `booking` type hasn't been created (or isn't
    // publicly ingestable) yet. See SAPT_SETUP_GUIDE.md, section 4.
    console.warn(
      `[/api/book] CRM record failed (type "${bookingTypeSlug}"): ${booking.error}`
    )
    return NextResponse.json(
      { ok: false, error: booking.error ?? 'Could not save your booking.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, bookingId: booking.data?.recordId ?? null })
}

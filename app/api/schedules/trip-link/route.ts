import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getPayload } from '@/lib/auth'
import { generateTripToken } from '@/lib/tripToken'

const bodySchema = z.object({
  scheduleId: z.string().refine(v => ObjectId.isValid(v), 'Invalid schedule ID'),
})

/**
 * Mints a short-lived driver link for one schedule.
 *
 * Drivers have no accounts, so the link itself is the credential: the operator
 * generates it from the dashboard and sends it to the driver. Everything the
 * live map will display (company, vehicle, route) is read from the database
 * here and baked into the signed token, so the driver's browser cannot later
 * claim to be a different bus.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const db = await getDatabase()

    // operatorId in the filter is what stops one operator minting a link for
    // another operator's bus.
    const schedule = await db.collection('schedules').findOne({
      _id: new ObjectId(parsed.data.scheduleId),
      operatorId: payload.operatorId,
    })
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const [route, operator] = await Promise.all([
      schedule.routeId
        ? db.collection('routes').findOne({ _id: new ObjectId(String(schedule.routeId)) })
        : null,
      db.collection('operators').findOne({ _id: new ObjectId(payload.operatorId) }),
    ])

    const token = generateTripToken({
      scheduleId: parsed.data.scheduleId,
      operatorId: payload.operatorId,
      companyName: String(operator?.companyName ?? ''),
      vehicleNumber: String(schedule.vehicleNumber ?? ''),
      routeNumber: String(route?.routeNumber ?? ''),
    })

    return NextResponse.json({ token, path: `/driver?token=${token}` })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create driver link' },
      { status: 500 }
    )
  }
}

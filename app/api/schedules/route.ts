import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getPayload } from '@/lib/auth'

const scheduleSchema = z.object({
  routeId: z.string().refine(v => ObjectId.isValid(v), 'Invalid route ID'),
  departureTime: z.string().min(1).max(20),
  arrivalTime: z.string().min(1).max(20),
  fare: z.number().positive(),
  driverName: z.string().min(1).max(120),
  vehicleNumber: z.string().min(1).max(50),
  status: z.enum(['active', 'inactive']),
  // Which days this trip runs. 0 = Sunday, matching JS getDay(), so the value
  // can be compared directly against $dayOfWeek - 1 in aggregation.
  // Schedules created before this field existed have no value; those are
  // treated as running every day rather than disappearing from the timetable.
  daysOfWeek: z.array(z.number().int().min(0).max(6))
    .min(1, 'Pick at least one day this trip runs')
    .max(7),
})

const scheduleUpdateSchema = scheduleSchema.extend({
  id: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDatabase()

    const schedules = await db.collection('schedules').aggregate([
      { $match: { operatorId: payload.operatorId } },
      {
        $lookup: {
          from: 'routes',
          localField: 'routeId',
          foreignField: '_id',
          as: 'route'
        }
      },
      { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } }
    ]).toArray()

    return NextResponse.json(schedules)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = scheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const db = await getDatabase()

    const result = await db.collection('schedules').insertOne({
      ...parsed.data,
      routeId: new ObjectId(parsed.data.routeId),  
      operatorId: payload.operatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ id: result.insertedId, ...parsed.data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create schedule' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = scheduleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }
    if (!ObjectId.isValid(parsed.data.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { id, ...scheduleData } = parsed.data
    const db = await getDatabase()

    await db.collection('schedules').updateOne(
      { _id: new ObjectId(id), operatorId: payload.operatorId },
      { $set: { ...scheduleData, routeId: new ObjectId(scheduleData.routeId), updatedAt: new Date() } }
    )

    return NextResponse.json({ id, ...scheduleData })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const db = await getDatabase()
    await db.collection('schedules').deleteOne({
      _id: new ObjectId(id),
      operatorId: payload.operatorId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}

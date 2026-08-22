import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getPayload } from '@/lib/auth'

const routeSchema = z.object({
  routeNumber: z.string().min(1).max(50),
  startPoint: z.string().min(1).max(150),
  endPoint: z.string().min(1).max(150),
  distance: z.number().positive(),
  estimatedTime: z.string().min(1).max(100),
  startTerminalId: z.string().refine(v => ObjectId.isValid(v), 'Invalid start terminal ID'),
  endTerminalId: z.string().refine(v => ObjectId.isValid(v), 'Invalid end terminal ID'),
})

const routeUpdateSchema = routeSchema.extend({
  id: z.string().refine(v => ObjectId.isValid(v), 'Invalid route ID'),
})

export async function GET(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDatabase()
    const routes = await db.collection('routes').aggregate([
      { $match: { operatorId: payload.operatorId } },

      // join start terminal
      {
        $lookup: {
          from: 'terminals',
          let: { tid: { $toObjectId: '$startTerminalId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$tid'] } } },
            { $project: { name: 1, lat: 1, lng: 1 } },
          ],
          as: 'startTerminal',
        },
      },
      { $unwind: { path: '$startTerminal', preserveNullAndEmptyArrays: true } },

      // join end terminal
      {
        $lookup: {
          from: 'terminals',
          let: { tid: { $toObjectId: '$endTerminalId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$tid'] } } },
            { $project: { name: 1, lat: 1, lng: 1 } },
          ],
          as: 'endTerminal',
        },
      },
      { $unwind: { path: '$endTerminal', preserveNullAndEmptyArrays: true } },
    ]).toArray()

    return NextResponse.json(routes)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch routes' },
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
    const parsed = routeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const db = await getDatabase()

    const result = await db.collection('routes').insertOne({
      ...parsed.data,
      operatorId: payload.operatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ id: result.insertedId, ...parsed.data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create route' },
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
    const parsed = routeUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { id, ...routeData } = parsed.data
    const db = await getDatabase()

    // operatorId stays in the filter so one operator can never edit another's route
    const result = await db.collection('routes').updateOne(
      { _id: new ObjectId(id), operatorId: payload.operatorId },
      { $set: { ...routeData, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    return NextResponse.json({ id, ...routeData })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update route' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const db = await getDatabase()

    // Refuse rather than orphan. Deleting a route silently used to leave its
    // schedules behind, still counting toward the dashboard's totals.
    const dependents = await db.collection('schedules').countDocuments({
      routeId: new ObjectId(id),
      operatorId: payload.operatorId,
    })
    if (dependents > 0) {
      return NextResponse.json(
        {
          error: `This route still has ${dependents} schedule${dependents === 1 ? '' : 's'}. Delete ${dependents === 1 ? 'it' : 'them'} first.`,
        },
        { status: 409 }
      )
    }

    await db.collection('routes').deleteOne({
      _id: new ObjectId(id),
      operatorId: payload.operatorId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete route' },
      { status: 500 }
    )
  }
}

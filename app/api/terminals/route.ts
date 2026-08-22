import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getPayload } from '@/lib/auth'

const terminalSchema = z.object({
  name: z.string().min(1).max(150),
  location: z.string().min(1).max(200),
  // Range-checked so a mistyped coordinate cannot be stored. These feed the
  // public map's terminal markers and the route polylines drawn between them,
  // so a bad value is visible to commuters rather than failing quietly.
  lat: z.number().min(-90, 'Latitude must be between -90 and 90')
                 .max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180')
                 .max(180, 'Longitude must be between -180 and 180'),
  facilities: z.array(z.string()).optional().default([]),
})

const terminalUpdateSchema = terminalSchema.extend({
  id: z.string().refine(v => ObjectId.isValid(v), 'Invalid terminal ID'),
})

export async function GET(request: NextRequest) {
  try {
    const payload = getPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDatabase()
    const terminals = await db.collection('terminals')
      .find({ operatorId: payload.operatorId })
      .toArray()

    return NextResponse.json(terminals)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch terminals' },
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
    const parsed = terminalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const db = await getDatabase()

    const result = await db.collection('terminals').insertOne({
      ...parsed.data,
      operatorId: payload.operatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ id: result.insertedId, ...parsed.data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create terminal' },
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
    const parsed = terminalUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { id, ...terminalData } = parsed.data
    const db = await getDatabase()

    // operatorId stays in the filter so one operator can never edit another's terminal
    const result = await db.collection('terminals').updateOne(
      { _id: new ObjectId(id), operatorId: payload.operatorId },
      { $set: { ...terminalData, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    return NextResponse.json({ id, ...terminalData })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update terminal' },
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

    // Refuse rather than orphan. Routes store terminal ids as strings, and the
    // $lookup in the routes API preserves empty matches, so a dangling
    // reference used to render as a blank cell instead of failing loudly.
    const dependents = await db.collection('routes').countDocuments({
      operatorId: payload.operatorId,
      $or: [{ startTerminalId: id }, { endTerminalId: id }],
    })
    if (dependents > 0) {
      return NextResponse.json(
        {
          error: `${dependents} route${dependents === 1 ? '' : 's'} still use${dependents === 1 ? 's' : ''} this terminal. Update ${dependents === 1 ? 'it' : 'them'} first.`,
        },
        { status: 409 }
      )
    }

    await db.collection('terminals').deleteOne({
      _id: new ObjectId(id),
      operatorId: payload.operatorId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete terminal' },
      { status: 500 }
    )
  }
}
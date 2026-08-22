import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getPayload } from '@/lib/auth'

const terminalSchema = z.object({
  name: z.string().min(1).max(150),
  location: z.string().min(1).max(200),
  lat: z.number(),
  lng: z.number(),
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
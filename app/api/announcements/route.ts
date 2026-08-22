import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getPayload } from '@/lib/auth'

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'alert']),
  affectedRoutes: z.array(z.string().min(1).max(50)).min(1).max(50),
})

const announcementUpdateSchema = announcementSchema.extend({
  id: z.string().refine(v => ObjectId.isValid(v), 'Invalid announcement ID'),
})

export async function GET(request: NextRequest) {
  const payload = getPayload(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = await getDatabase()
    const announcements = await db.collection('announcements')
      .find({ operatorId: payload.operatorId })
      .sort({ createdAt: -1 })
      .toArray()
    return NextResponse.json(announcements)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const payload = getPayload(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = announcementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const db = await getDatabase()
    const result = await db.collection('announcements').insertOne({
      ...parsed.data,
      operatorId: payload.operatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ id: result.insertedId, ...parsed.data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const payload = getPayload(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = announcementUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { id, ...announcementData } = parsed.data
    const db = await getDatabase()

    // operatorId stays in the filter so one operator can never edit another's announcement
    const result = await db.collection('announcements').updateOne(
      { _id: new ObjectId(id), operatorId: payload.operatorId },
      { $set: { ...announcementData, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json({ id, ...announcementData })
  } catch {
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const payload = getPayload(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const db = await getDatabase()
    await db.collection('announcements').deleteOne({
      _id: new ObjectId(id),
      operatorId: payload.operatorId,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
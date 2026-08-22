import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    const db = await getDatabase()

    const pipeline: object[] = [
      // 1. Filter by search query if provided
      ...(query ? [{
        $match: {
          $or: [
            { routeNumber: { $regex: query, $options: 'i' } },
            { startPoint:  { $regex: query, $options: 'i' } },
            { endPoint:    { $regex: query, $options: 'i' } },
          ],
        },
      }] : []),

      // 2. Join schedules
      {
        $lookup: {
          from: 'schedules',
          localField: '_id',
          foreignField: 'routeId',
          as: 'schedules',
        },
      },

      // 3. Keep only active schedules that actually run today.
      //    daysOfWeek is 0=Sunday (JS getDay). Mongo's $dayOfWeek is 1=Sunday,
      //    hence the -1. Schedules saved before daysOfWeek existed have no
      //    field at all; those are treated as running every day so an existing
      //    timetable does not vanish from the public map.
      {
        $addFields: {
          schedules: {
            $filter: {
              input: '$schedules',
              as: 'sched',
              cond: {
                $and: [
                  { $eq: ['$$sched.status', 'active'] },
                  {
                    $or: [
                      { $eq: [{ $type: '$$sched.daysOfWeek' }, 'missing'] },
                      { $eq: [{ $size: { $ifNull: ['$$sched.daysOfWeek', []] } }, 0] },
                      {
                        $in: [
                          { $subtract: [{ $dayOfWeek: '$$NOW' }, 1] },
                          { $ifNull: ['$$sched.daysOfWeek', []] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      // 4. Only show routes that have at least one active schedule
      {
        $match: { 'schedules.0': { $exists: true } },
      },

      // 5. Cast operatorId string → ObjectId for operator join
      {
        $addFields: {
          operatorObjectId: {
            $cond: {
              if: { $and: [
                { $ne: ['$operatorId', null] },
                { $ne: ['$operatorId', ''] },
              ]},
              then: { $toObjectId: '$operatorId' },
              else: null,
            }
          },
        },
      },

      // 6. Join operator to get companyName
      {
        $lookup: {
          from: 'operators',
          localField: 'operatorObjectId',
          foreignField: '_id',
          as: 'operator',
        },
      },
      { $unwind: { path: '$operator', preserveNullAndEmptyArrays: true } },

      // 7. Join start terminal
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

      // 8. Join end terminal
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

      // 9. Shape the final output
      {
        $project: {
          routeNumber:   1,
          startPoint:    1,
          endPoint:      1,
          distance:      1,
          estimatedTime: 1,
          startTerminalId: 1,
          endTerminalId:   1,
          startTerminal:   1,
          endTerminal:     1,
          companyName: '$operator.companyName',
          schedules: {
            $map: {
              input: '$schedules',
              as: 's',
              in: {
                _id:           '$$s._id',
                departureTime: '$$s.departureTime',
                arrivalTime:   '$$s.arrivalTime',
                fare:          '$$s.fare',
                vehicleNumber: '$$s.vehicleNumber',
                status:        '$$s.status',
              },
            },
          },
        },
      },
    ]

    const routes = await db.collection('routes').aggregate(pipeline).toArray()
    return NextResponse.json(routes)
  } catch (error) {
    console.error('[GET /api/public/routes]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch routes' },
      { status: 500 }
    )
  }
}
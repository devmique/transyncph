import { createServer } from 'http'
import { parse } from 'url'
import { loadEnvConfig } from '@next/env'
import next from 'next'

// This process is started by tsx, not by the Next CLI, so .env.local is not
// loaded for us. The socket handlers below need JWT_SECRET to verify trip
// tokens, so load it before anything reads process.env.
loadEnvConfig(process.cwd())

import { Server } from 'socket.io'
import { verifyTripToken } from './lib/tripToken'

const dev  = process.env.NODE_ENV !== 'production'
const app  = next({ dev })
const handle = app.getRequestHandler()

interface LocationPayload {
  scheduleId: string
  lat: number
  lng: number
  vehicleNumber?: string
  routeNumber?: string
  companyName?: string
}

// What a driver client is allowed to send. Identity is never taken from here -
// it comes from the signed trip token.
interface DriverLocationMessage {
  token: string
  lat: number
  lng: number
}

const isPlausibleCoord = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' && typeof lng === 'number' &&
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: { origin: ['http://localhost:3000',
       'https://transyncph.vercel.app'],
        methods: ['GET', 'POST'] },
  })

  // Track active buses in memory so late-joining commuters see current state
  const activeBuses = new Map<string, LocationPayload>()
  
  const lastUpdateMap = new Map<string, number>() // For throttling updates per schedule
  const THROTTLE_MS = 1000 // 1 update per second per bus

  io.on('connection', (socket) => {
    // Send current active buses to newly connected commuters
    socket.emit('bus:snapshot', Array.from(activeBuses.values()))

    // Driver: start broadcasting for a schedule.
    //
    // The bus this update belongs to is taken from the signed trip token, never
    // from the message body. Without this any client that guessed a schedule id
    // could put a phantom bus on the public map or hijack a real bus's marker
    // and feed commuters wrong positions.
    socket.on('driver:location', (data: DriverLocationMessage) => {
      const trip = data?.token ? verifyTripToken(data.token) : null
      if (!trip) return

      if (!isPlausibleCoord(data.lat, data.lng)) return

      const now = Date.now()
      const last = lastUpdateMap.get(trip.scheduleId) || 0
      if (now - last < THROTTLE_MS) return
      lastUpdateMap.set(trip.scheduleId, now)

      const payload: LocationPayload = {
        scheduleId: trip.scheduleId,
        lat: data.lat,
        lng: data.lng,
        vehicleNumber: trip.vehicleNumber,
        routeNumber: trip.routeNumber,
        companyName: trip.companyName,
      }

      activeBuses.set(trip.scheduleId, payload)
      // Broadcast stays global on purpose: /map is a public, multi-operator
      // commuter route finder that shows every company's buses.
      io.emit('bus:location', payload)
    })

    // Driver: trip ended. Also token-gated, otherwise anyone could erase any
    // bus from the live map.
    socket.on('driver:end', (token: string) => {
      const trip = typeof token === 'string' ? verifyTripToken(token) : null
      if (!trip) return

      activeBuses.delete(trip.scheduleId)
      lastUpdateMap.delete(trip.scheduleId)
      io.emit('bus:removed', trip.scheduleId)
    })

  })

  const port = parseInt(process.env.PORT || '4000', 10)
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
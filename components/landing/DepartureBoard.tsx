'use client'

/* The hero. A terminal departure board, built from the same public endpoints
 * the commuter map uses, so it shows this network's real routes and real
 * departure times and marks the trips that are transmitting GPS right now.
 *
 * The point is that it is not a screenshot. A page that asserts "live" is
 * ordinary; a page that is live is worth opening twice. */

import { useEffect, useMemo, useState } from 'react'
import { Radio } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { LiveBus, Route } from '@/types'

type Trip = {
  id: string
  routeNumber: string
  origin: string
  destination: string
  minutes: number
  time: string
  company?: string
  /** True when the board has rolled past the last bus of the day and is
   *  showing the next service instead. Without the label a 01:01 sitting on
   *  the board at 19:41 reads as a departure you have eighteen hours to miss. */
  tomorrow: boolean
}

const ROWS = 6

/** Departure times are stored as display strings ("08:00 AM") by the schedule
 *  form, while older rows are 24-hour. Accept both. */
function toMinutes(value: unknown): number | null {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return null

  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const period = match[3]?.toUpperCase()

  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  if (h < 0 || h > 23 || m < 0 || m > 59) return null

  return h * 60 + m
}

/** 12-hour with AM/PM, matching to12Hour elsewhere in the app. A bare 24-hour
 *  "01:01" reads as ambiguous on a board a commuter glances at once. */
function clockLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

export default function DepartureBoard() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/routes')
      .then(res => (res.ok ? res.json() : []))
      .then(data => { if (!cancelled) setRoutes(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setRoutes([]) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const ids = (buses: LiveBus[]) => new Set(buses.map(b => b.scheduleId))

    socket.on('bus:snapshot', (buses: LiveBus[]) => setLiveIds(ids(buses)))
    socket.on('bus:location', (bus: LiveBus) =>
      setLiveIds(prev => (prev.has(bus.scheduleId) ? prev : new Set(prev).add(bus.scheduleId))),
    )
    socket.on('bus:removed', (scheduleId: string) =>
      setLiveIds(prev => {
        if (!prev.has(scheduleId)) return prev
        const next = new Set(prev)
        next.delete(scheduleId)
        return next
      }),
    )
    return () => {
      socket.off('bus:snapshot')
      socket.off('bus:location')
      socket.off('bus:removed')
    }
  }, [])

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : 0

  const trips: Trip[] = useMemo(() => {
    const all: Trip[] = []
    for (const route of routes) {
      for (const s of route.schedules ?? []) {
        const minutes = toMinutes(s.departureTime)
        if (minutes === null) continue
        all.push({
          id: String(s._id),
          routeNumber: route.routeNumber,
          origin: route.startPoint,
          destination: route.endPoint,
          minutes,
          time: clockLabel(minutes),
          company: route.companyName,
          tomorrow: false,
        })
      }
    }
    all.sort((a, b) => a.minutes - b.minutes)

    // Show what is still to come. Once the last bus has gone, roll around to
    // the next day's first departures rather than showing an empty board.
    const upcoming = all.filter(t => t.minutes >= nowMinutes)
    if (upcoming.length >= ROWS) return upcoming.slice(0, ROWS)

    const rolled = all.map(t => ({ ...t, tomorrow: true }))
    return [...upcoming, ...rolled].slice(0, ROWS)
  }, [routes, nowMinutes])

  const liveCount = useMemo(
    () => trips.filter(t => liveIds.has(t.id)).length,
    [trips, liveIds],
  )

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">

      {/* Board header — the strip above every terminal board */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-5 h-12 border-b border-white/10 bg-white/[0.03]">
        <p className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-slate-400">
          Departures
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping motion-reduce:animate-none" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              {liveCount} on the road
            </span>
          )}
          <span className="text-[11px] font-mono tabular-nums text-slate-500">
            {now
              ? now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })
              : '--:--'}
          </span>
        </div>
      </div>

      {/* Column rule */}
      <div className="hidden sm:grid grid-cols-[3.5rem_1fr_5.5rem_4.5rem] gap-3 px-5 py-2 border-b border-white/5 text-[10px] font-mono tracking-widest uppercase text-slate-600">
        <span>Route</span>
        <span>Service</span>
        <span className="text-right">Departs</span>
        <span className="text-right">Status</span>
      </div>

      <div className="divide-y divide-white/5">
        {!loaded ? (
          [...Array(ROWS)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <div className="h-4 w-10 bg-white/5 rounded animate-pulse" />
              <div className="h-4 flex-1 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
            </div>
          ))
        ) : trips.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-slate-400">No trips are published on this network yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Operators publish a timetable and it appears here, and on the commuter map.
            </p>
          </div>
        ) : (
          trips.map((trip, i) => {
            const isLive = liveIds.has(trip.id)
            return (
              <div
                key={`${trip.id}-${i}`}
                /* flap-in: each row settles a beat after the one above, the way
                   a real board cascades when it updates. */
                className="flap-row grid grid-cols-[3.5rem_1fr_5.5rem] sm:grid-cols-[3.5rem_1fr_5.5rem_4.5rem] gap-3 items-center px-4 sm:px-5 py-3.5"
                style={{ '--i': i } as React.CSSProperties}
              >
                <span className="font-mono text-sm font-bold text-blue-400 tabular-nums">
                  {trip.routeNumber}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm text-slate-200 truncate">
                    {trip.origin}
                    <span className="text-slate-600 mx-1.5">→</span>
                    {trip.destination}
                  </span>
                  {trip.company && (
                    <span className="block text-[11px] text-slate-600 truncate">{trip.company}</span>
                  )}
                </span>

                <span className="font-mono text-sm text-slate-300 tabular-nums text-right">
                  {trip.time}
                </span>

                <span className="hidden sm:flex justify-end">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      <Radio className="w-2.5 h-2.5" />
                      Live
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono tracking-wider uppercase text-slate-600">
                      {trip.tomorrow ? 'Next day' : 'Scheduled'}
                    </span>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
        <p className="text-[11px] text-slate-600">
          Live board, straight from this network&apos;s public timetable.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  MapPin, Building2, Clock, Radio,
  ArrowRight, Activity, CheckCircle2, XCircle,
  AlertCircle, ChevronRight,
} from 'lucide-react'

import { AnyDoc, LiveBus } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { getSocket } from '@/lib/socket'
import {
  ChartCard, ServiceCurve, WeeklyCoverage, FleetDonut, RouteLoadBars,
  RUNNING, IDLE, OFF,
  type HourBucket, type DayBucket, type FleetSlice, type RouteLoad,
} from '@/components/dashboard/charts'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className ?? ''}`} />
)

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Clock time to minutes since midnight, or null if it is not a clock time.
 *  Accepts both shapes the database holds: the schedule form saves display
 *  strings ("10:00 AM") via to12Hour, while older rows and the raw <input>
 *  value are 24-hour ("10:00"). */
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

/** Format back out of minutes, so display never depends on how the row was
 *  stored. Passing a "10:00 AM" row through to12Hour would yield "10:00 AM AM". */
function clockLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

/** 0 becomes "12a", 13 becomes "1p". Short enough to fit 24 ticks on a phone. */
function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

/** A schedule with no daysOfWeek predates the field and is treated as daily,
 *  matching what the public map does in app/api/public/routes/route.ts. */
function runsOn(schedule: AnyDoc, weekday: number): boolean {
  const days = schedule.daysOfWeek
  if (!Array.isArray(days) || days.length === 0) return true
  return days.includes(weekday)
}

type RouteRow = {
  id: string
  routeNumber: string
  startPoint: string
  endPoint: string
  activeSchedules: number
  totalSchedules: number
  vehicles: string[]
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { operator } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [schedules, setSchedules] = useState<AnyDoc[]>([])
  const [routeDocs, setRouteDocs] = useState<AnyDoc[]>([])
  const [terminals, setTerminals] = useState<AnyDoc[]>([])
  const [liveBuses, setLiveBuses] = useState<LiveBus[]>([])

  // Null until mounted so the server and the first client render agree; a clock
  // rendered during SSR would hydrate against a different minute.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  /* ── live buses ──
     The socket broadcast is public and carries every operator's buses, because
     the commuter map is multi-operator. Filter to this company before counting,
     or the fleet chart reports other people's vehicles. */
  useEffect(() => {
    const companyName = operator?.companyName
    if (!companyName) return
    const mine = (b: LiveBus) => b.companyName === companyName
    const socket = getSocket()

    socket.on('bus:snapshot', (buses: LiveBus[]) => setLiveBuses(buses.filter(mine)))
    socket.on('bus:location', (bus: LiveBus) =>
      setLiveBuses(prev =>
        mine(bus) ? [...prev.filter(b => b.scheduleId !== bus.scheduleId), bus] : prev,
      ),
    )
    socket.on('bus:removed', (scheduleId: string) =>
      setLiveBuses(prev => prev.filter(b => b.scheduleId !== scheduleId)),
    )
    return () => {
      socket.off('bus:snapshot')
      socket.off('bus:location')
      socket.off('bus:removed')
    }
  }, [operator?.companyName])

  /* ── data ── */
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const fetchJson = async (url: string) => {
          const res = await fetch(url)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || `Failed: ${url}`)
          return Array.isArray(data) ? (data as AnyDoc[]) : []
        }

        const [routesRaw, schedulesRaw, terminalsRaw] = await Promise.all([
          fetchJson('/api/routes'),
          fetchJson('/api/schedules'),
          fetchJson('/api/terminals'),
        ])

        if (!cancelled) {
          setRouteDocs(routesRaw)
          setSchedules(schedulesRaw)
          setTerminals(terminalsRaw)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  /* ── derived ── */

  const weekday = now?.getDay() ?? new Date().getDay()
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : 0

  /** Trips that are switched on AND scheduled to run today. Every chart below
   *  is scoped to this, because "today" is the question the page answers. */
  const runningToday = useMemo(
    () => schedules.filter(s => s.status === 'active' && runsOn(s, weekday)),
    [schedules, weekday],
  )

  const hourly: HourBucket[] = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour, label: hourLabel(hour), departures: 0,
    }))
    for (const s of runningToday) {
      const mins = toMinutes(s.departureTime)
      if (mins !== null) buckets[Math.floor(mins / 60)].departures++
    }
    return buckets
  }, [runningToday])

  const weekly: DayBucket[] = useMemo(() => {
    const active = schedules.filter(s => s.status === 'active')
    return DAY_NAMES.map((day, i) => ({
      day,
      trips: active.filter(s => runsOn(s, i)).length,
      isToday: i === weekday,
    }))
  }, [schedules, weekday])

  const fleet = useMemo(() => {
    const all = new Set(
      schedules.map(s => String(s.vehicleNumber ?? '').trim()).filter(Boolean),
    )
    const onRoad = new Set(
      liveBuses.map(b => String(b.vehicleNumber ?? '').trim()).filter(Boolean),
    )
    const dueToday = new Set(
      runningToday.map(s => String(s.vehicleNumber ?? '').trim()).filter(Boolean),
    )
    const waiting = [...dueToday].filter(v => !onRoad.has(v))
    const off = [...all].filter(v => !onRoad.has(v) && !dueToday.has(v))

    const slices: FleetSlice[] = [
      { name: 'On the road', value: onRoad.size,    color: RUNNING },
      { name: 'Due out',     value: waiting.length, color: IDLE },
      { name: 'Not running', value: off.length,     color: OFF },
    ]
    return { slices, total: all.size, onRoad: onRoad.size }
  }, [schedules, runningToday, liveBuses])

  const routeLoad: RouteLoad[] = useMemo(() => {
    const byRoute = new Map<string, RouteLoad>()
    for (const s of runningToday) {
      const label = String(s.route?.routeNumber ?? s.routeNumber ?? '—')
      const entry = byRoute.get(label) ?? { route: label, trips: 0, fareCeiling: 0 }
      entry.trips++
      entry.fareCeiling += Number(s.fare) || 0
      byRoute.set(label, entry)
    }
    return [...byRoute.values()].sort((a, b) => b.trips - a.trips).slice(0, 6)
  }, [runningToday])

  /** The next trips due out, which is what a dispatcher checks the clock for. */
  const nextDepartures = useMemo(() => {
    return runningToday
      .map(s => ({ s, mins: toMinutes(s.departureTime) }))
      .filter((x): x is { s: AnyDoc; mins: number } => x.mins !== null && x.mins >= nowMinutes)
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 5)
      .map(({ s, mins }) => ({
        id: String(s._id),
        route: String(s.route?.routeNumber ?? s.routeNumber ?? '—'),
        vehicle: String(s.vehicleNumber ?? '—'),
        time: clockLabel(mins),
        inMinutes: mins - nowMinutes,
      }))
  }, [runningToday, nowMinutes])

  const departuresLeft = useMemo(
    () => runningToday.filter(s => {
      const m = toMinutes(s.departureTime)
      return m !== null && m >= nowMinutes
    }).length,
    [runningToday, nowMinutes],
  )

  const routesRunningToday = useMemo(
    () => new Set(runningToday.map(s => String(s.routeId ?? '')).filter(Boolean)).size,
    [runningToday],
  )

  const routes: RouteRow[] = useMemo(
    () => routeDocs.map(r => {
      const rid = String(r._id ?? '')
      const rowSchedules = schedules.filter(s => String(s.routeId ?? '') === rid)
      const rowActive = rowSchedules.filter(s => s.status === 'active')
      return {
        id: rid,
        routeNumber: String(r.routeNumber ?? '—'),
        startPoint: String(r.startPoint ?? '—'),
        endPoint: String(r.endPoint ?? '—'),
        activeSchedules: rowActive.length,
        totalSchedules: rowSchedules.length,
        vehicles: [...new Set(rowSchedules.map(s => String(s.vehicleNumber ?? '')).filter(Boolean))],
      }
    }),
    [routeDocs, schedules],
  )

  const isWeekend = weekday === 0 || weekday === 6

  /* ── stat cards ──
     Counts are not states, so they get no colour. The only exception is the
     live dot, which reports a condition rather than decorating one. */
  const statCards = [
    {
      key: 'live',
      label: 'On the road now',
      value: String(fleet.onRoad),
      sub: fleet.onRoad > 0 ? 'transmitting GPS' : 'no buses transmitting',
      icon: Radio,
      href: '/map',
      live: true,
    },
    {
      key: 'departures',
      label: 'Departures left',
      value: String(departuresLeft),
      sub: `of ${runningToday.length} today`,
      icon: Clock,
      href: '/dashboard/schedules',
      live: false,
    },
    {
      key: 'routes',
      label: 'Routes running',
      value: `${routesRunningToday}/${routeDocs.length}`,
      sub: isWeekend ? 'weekend service' : 'weekday service',
      icon: MapPin,
      href: '/dashboard/routes',
      live: false,
    },
    {
      key: 'terminals',
      label: 'Terminals',
      value: String(terminals.length),
      sub: 'pickup points on the map',
      icon: Building2,
      href: '/dashboard/terminals',
      live: false,
    },
  ]

  return (
    <div className="space-y-4">

      {/* ── Heading ── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            {operator?.companyName ? `${operator.companyName} — today's service` : "Today's service"}
          </p>
        </div>
        <p className="text-sm text-slate-500 font-mono tabular-nums">
          {now
            ? `${now.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' })} · ${now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })}`
            : '—'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Link
            key={s.key}
            href={s.href}
            className="group bg-slate-900/60 border border-white/8 rounded-xl px-5 py-5 flex items-start justify-between hover:border-white/15 hover:bg-slate-900/80 transition"
          >
            <div className="min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">{s.label}</p>
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className="text-3xl font-bold text-slate-100 tracking-tight font-mono tabular-nums">
                  {s.value}
                </p>
              )}
              <p className="text-[11px] text-slate-600 mt-1.5 truncate">{s.sub}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ml-3 relative">
              <s.icon className="w-4.5 h-4.5 text-slate-400" />
              {s.live && fleet.onRoad > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping motion-reduce:animate-none" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── SERVICE CURVE (the hero) ── */}
      <ChartCard
        title="Today's service curve"
        hint="Departures per hour, from the trips set to run today"
        action={
          <Link
            href="/dashboard/schedules"
            className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition shrink-0"
          >
            Timetable <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        {loading
          ? <Skeleton className="h-[220px] w-full" />
          : <ServiceCurve data={hourly} nowLabel={hourLabel(Math.floor(nowMinutes / 60))} />}
      </ChartCard>

      {/* ── Next out + fleet ── */}
      <div className="grid lg:grid-cols-5 gap-4">

        <div className="lg:col-span-3 min-w-0 bg-slate-900/60 border border-white/8 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Next out</h2>
              <p className="text-xs text-slate-500 mt-0.5">Trips due to leave after right now</p>
            </div>
            <Link
              href="/dashboard/schedules"
              className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition shrink-0"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : nextDepartures.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">
                {runningToday.length === 0
                  ? 'Nothing is scheduled to run today.'
                  : 'That was the last departure — service is done for today.'}
              </p>
              <Link href="/dashboard/schedules" className="text-xs text-blue-400 hover:underline mt-1 inline-block">
                Open the timetable
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {nextDepartures.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold text-slate-100 font-mono tabular-nums shrink-0 w-[4.5rem]">
                      {d.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100 truncate">Route {d.route}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{d.vehicle}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] font-medium font-mono tabular-nums px-2 py-0.5 rounded-full ${
                    d.inMinutes <= 30 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-slate-500'
                  }`}>
                    {d.inMinutes < 60 ? `in ${d.inMinutes}m` : `in ${Math.floor(d.inMinutes / 60)}h ${d.inMinutes % 60}m`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 min-w-0">
          <ChartCard title="Where the fleet is" hint="Every vehicle number in your timetable">
            {loading ? (
              <Skeleton className="h-[196px] w-full" />
            ) : (
              <>
                <FleetDonut data={fleet.slices} total={fleet.total} />
                <div className="space-y-1.5 mt-4 pt-4 border-t border-white/5">
                  {fleet.slices.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-400">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span className="text-slate-300 font-mono tabular-nums">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>
      </div>

      {/* ── Weekly coverage + route load ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Weekly coverage" hint="Active trips running on each day of the week">
          {loading ? <Skeleton className="h-[180px] w-full" /> : <WeeklyCoverage data={weekly} />}
        </ChartCard>

        <ChartCard title="Busiest routes today" hint="Trips per route — hover for the fare ceiling">
          {loading ? <Skeleton className="h-[200px] w-full" /> : <RouteLoadBars data={routeLoad} />}
        </ChartCard>
      </div>

      {/* ── ROUTES TABLE ── */}
      <div className="bg-slate-900/60 border border-white/8 rounded-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100">Routes status</h2>
          </div>
          <Link
            href="/dashboard/routes"
            className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition"
          >
            Manage routes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Route</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">From → To</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Schedules</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Vehicles</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  </tr>
                ))
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    No routes yet.{' '}
                    <Link href="/dashboard/routes" className="text-blue-400 hover:underline">Add your first route</Link>
                  </td>
                </tr>
              ) : (
                routes.map(r => {
                  const hasActive = r.activeSchedules > 0
                  return (
                    <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition">
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-semibold text-slate-100">{r.routeNumber}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-slate-400">{r.startPoint} → {r.endPoint}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {hasActive
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          }
                          <span className="text-sm text-slate-400 font-mono tabular-nums">{r.activeSchedules}/{r.totalSchedules}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-500 font-mono">
                          {r.vehicles.length > 0
                            ? r.vehicles.slice(0, 2).join(', ') + (r.vehicles.length > 2 ? ` +${r.vehicles.length - 2}` : '')
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          hasActive
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-700/60 text-slate-500'
                        }`}>
                          {hasActive ? 'Active' : 'No schedule'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

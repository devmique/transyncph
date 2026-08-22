'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bus, MapPin, TrendingUp, Building2, Clock,
  ArrowRight, Activity, CheckCircle2, XCircle,
  AlertCircle, ChevronRight,
} from 'lucide-react'
import { safeDateToMs, formatTimeAgo, formatPHPCompact, to12Hour } from '@/utils/format'
import { ActivityItem, AnyDoc } from '@/types'

/* ─── tiny helpers ─── */
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className ?? ''}`} />
)

function StatBadge({ pct, label }: { pct: number; label: string }) {
  // Healthy is the quiet default. Colour only appears once a number is
  // genuinely worth looking at, so an amber bar means something rather than
  // being the normal state of a working fleet - 75% utilisation used to render
  // as a warning under the old 80/50 split.
  const color =
    pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-400 font-medium font-mono tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({
    activeRoutes: '—',
    totalVehicles: '—',
    terminals: '—',
    totalSchedules: '—',
  })

  const [rates, setRates] = useState({
    scheduleRate: 0,
    fleetUtil: 0,
  })

  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [recentSchedules, setRecentSchedules] = useState<AnyDoc[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

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
          return data
        }

        const [announcementsRaw, routesRaw, schedulesRaw, terminalsRaw] = await Promise.all([
          fetchJson('/api/announcements'),
          fetchJson('/api/routes'),
          fetchJson('/api/schedules'),
          fetchJson('/api/terminals'),
        ])

        const announcements: AnyDoc[] = Array.isArray(announcementsRaw) ? announcementsRaw : []
        const routesDocs: AnyDoc[] = Array.isArray(routesRaw) ? routesRaw : []
        const schedules: AnyDoc[] = Array.isArray(schedulesRaw) ? schedulesRaw : []
        const terminals: AnyDoc[] = Array.isArray(terminalsRaw) ? terminalsRaw : []

        /* ── computed stats ── */
        const activeSchedules = schedules.filter((s) => s?.status === 'active')
        const activeRouteIds = new Set(
          activeSchedules.map((s) => String(s.routeId ?? '')).filter(Boolean),
        )
        const allVehicles = new Set(schedules.map((s) => String(s.vehicleNumber ?? '')).filter(Boolean))
        const activeVehicles = new Set(
          activeSchedules.map((s) => String(s.vehicleNumber ?? '')).filter(Boolean),
        )
        const scheduleRate = schedules.length ? (activeSchedules.length / schedules.length) * 100 : 0
        const fleetUtil = allVehicles.size ? (activeVehicles.size / allVehicles.size) * 100 : 0

        /* ── routes table ── */
        const routeRows: RouteRow[] = routesDocs.map((r) => {
          const rid = String(r._id ?? '')
          const rowSchedules = schedules.filter((s) => String(s.routeId ?? '') === rid)
          const rowActive = rowSchedules.filter((s) => s.status === 'active')
          const vehicles = [...new Set(rowSchedules.map((s) => String(s.vehicleNumber ?? '')).filter(Boolean))]
          return {
            id: rid,
            routeNumber: String(r.routeNumber ?? '—'),
            startPoint: String(r.startPoint ?? '—'),
            endPoint: String(r.endPoint ?? '—'),
            activeSchedules: rowActive.length,
            totalSchedules: rowSchedules.length,
            vehicles,
          }
        })

        /* ── recent schedules (latest 5 by arrival time string) ── */
        const recent5 = [...schedules]
          .sort((a, b) => {
            const ta = safeDateToMs(a.updatedAt ?? a.createdAt) ?? 0
            const tb = safeDateToMs(b.updatedAt ?? b.createdAt) ?? 0
            return tb - ta
          })
          .slice(0, 5)

        /* ── activity feed ── */
        const candidates: ActivityItem[] = []
        for (const a of announcements) {
          const tsMs = safeDateToMs(a.updatedAt ?? a.createdAt)
          if (tsMs === null) continue
          candidates.push({
            key: `ann-${String(a._id ?? a.title)}-${tsMs}`,
            label: `Announcement: ${String(a.title ?? 'Untitled')}`,
            time: formatTimeAgo(tsMs),
            tsMs,
          })
        }
        for (const r of routesDocs) {
          const tsMs = safeDateToMs(r.updatedAt ?? r.createdAt)
          if (tsMs === null) continue
          candidates.push({
            key: `route-${String(r._id)}-${tsMs}`,
            label: `Route updated: ${String(r.routeNumber ?? '—')}`,
            time: formatTimeAgo(tsMs),
            tsMs,
          })
        }
        for (const s of schedules) {
          const tsMs = safeDateToMs(s.updatedAt ?? s.createdAt)
          if (tsMs === null) continue
          const routeLabel = s.route?.routeNumber
            ? `${s.route.routeNumber} · ${s.route.startPoint} → ${s.route.endPoint}`
            : '—'
          candidates.push({
            key: `sched-${String(s._id)}-${tsMs}`,
            label: `Schedule updated: ${routeLabel}`,
            time: formatTimeAgo(tsMs),
            tsMs,
          })
        }
        for (const t of terminals) {
          const tsMs = safeDateToMs(t.updatedAt ?? t.createdAt)
          if (tsMs === null) continue
          candidates.push({
            key: `terminal-${String(t._id)}-${tsMs}`,
            label: `Terminal updated: ${String(t.name ?? 'Terminal')}`,
            time: formatTimeAgo(tsMs),
            tsMs,
          })
        }
        candidates.sort((a, b) => b.tsMs - a.tsMs)

        if (!cancelled) {
          setStats({
            activeRoutes: String(activeRouteIds.size),
            totalVehicles: String(allVehicles.size),
            terminals: String(terminals.length),
            totalSchedules: String(schedules.length),
          })
          setRates({ scheduleRate, fleetUtil })
          setRoutes(routeRows)
          setRecentSchedules(recent5)
          setActivity(candidates.slice(0, 6))
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

  /* ── stat card definitions ── */
  // Counts are not states, so they get no colour. Routes are not "more blue"
  // than terminals - hue here encoded nothing and competed with emerald/amber,
  // which do carry meaning elsewhere on this page. The number is the
  // information; the icon is just a signpost.
  const statCards = [
    { key: 'activeRoutes',   label: 'Active Routes',   icon: MapPin,     href: '/dashboard/routes' },
    { key: 'totalVehicles',  label: 'Total Vehicles',  icon: Bus,        href: '/dashboard/schedules' },
    { key: 'terminals',      label: 'Terminals',       icon: Building2,  href: '/dashboard/terminals' },
    { key: 'totalSchedules', label: 'Total Schedules', icon: Clock,      href: '/dashboard/schedules' },
  ]

  return (
    <div className="space-y-8">

      {/* ── Heading ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Here&apos;s a live summary of your bus operations.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
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
                  {(stats as any)[s.key]}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ml-3">
              <s.icon className="w-4.5 h-4.5 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── MIDDLE ROW: Fleet Health + Recent Schedules ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Fleet Health */}
        <div className="bg-slate-900/60 border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100">Fleet Health</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">live</span>
          </div>

          {loading ? (
            <div className="space-y-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              <StatBadge pct={rates.scheduleRate} label="Active Schedule Rate" />
              <StatBadge pct={rates.fleetUtil} label="Fleet Utilization" />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white/3 border border-white/5 rounded-lg px-3 py-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Active Schedules</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                    {loading ? '—' : Math.round((rates.scheduleRate / 100) * parseInt(stats.totalSchedules || '0'))}
                  </p>
                </div>
                <div className="bg-white/3 border border-white/5 rounded-lg px-3 py-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Idle Vehicles</p>
                  <p className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                    {loading ? '—' : Math.max(0, parseInt(stats.totalVehicles || '0') - Math.round((rates.fleetUtil / 100) * parseInt(stats.totalVehicles || '0')))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Schedules */}
        <div className="bg-slate-900/60 border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-100">Recent Schedules</h2>
            </div>
            <Link
              href="/dashboard/schedules"
              className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : recentSchedules.length === 0 ? (
            <p className="text-sm text-slate-500">No schedules yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentSchedules.map((s, i) => {
                const routeLabel = s.route?.routeNumber ?? s.routeNumber ?? '—'
                const dep = s.departureTime ? to12Hour(String(s.departureTime)) : '—'
                const arr = s.arrivalTime ? to12Hour(String(s.arrivalTime)) : '—'
                const active = s.status === 'active'
                return (
                  <div
                    key={String(s._id ?? i)}
                    className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg px-3 py-2.5 gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100 truncate">Route {routeLabel}</p>
                      <p className="text-[11px] text-slate-500">{dep} → {arr}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-700/60 text-slate-500'
                    }`}>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ROUTES TABLE ── */}
      <div className="bg-slate-900/60 border border-white/8 rounded-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100">Routes Status</h2>
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
                    No routes found.{' '}
                    <Link href="/dashboard/routes" className="text-blue-400 hover:underline">Add your first route</Link>
                  </td>
                </tr>
              ) : (
                routes.map((r) => {
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
                        <span className="text-sm text-slate-500">
                          {r.vehicles.length > 0 ? r.vehicles.slice(0, 2).join(', ') + (r.vehicles.length > 2 ? ` +${r.vehicles.length - 2}` : '') : '—'}
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

      {/* ── RECENT ACTIVITY ── */}
      <div className="bg-slate-900/60 border border-white/8 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-100">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 shrink-0" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <div className="space-y-0.5">
            {activity.map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center justify-between py-2.5 ${i < activity.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
                  <p className="text-sm text-slate-100 truncate">{item.label}</p>
                </div>
                <p className="text-xs text-slate-500 shrink-0 ml-4">{item.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
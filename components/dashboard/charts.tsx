'use client'

/* Chart primitives for the operations overview.
 *
 * Palette is deliberately the product's existing one - blue is the accent,
 * emerald/amber/slate already mean running/idle/off across the dashboard. No
 * new hues: on this page a colour is a status, so an extra series colour would
 * read as a status that does not exist. */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

export const ACCENT  = '#3b82f6'   // blue-500  - the product accent
export const RUNNING = '#10b981'   // emerald-500
export const IDLE    = '#f59e0b'   // amber-500
export const OFF     = '#475569'   // slate-600

const AXIS = { fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }
const GRID = 'rgba(255,255,255,0.05)'

/** Recharts animates on mount; honour the OS setting rather than overriding it. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* ─── shared shells ─────────────────────────────────────────────────────── */

export function ChartCard({
  title, hint, action, children,
}: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    /* min-w-0 is load-bearing: recharts' ResponsiveContainer measures this
       element, and a grid child defaults to min-width:auto, so the chart can
       widen its own parent and re-measure in a loop that hangs the tab. */
    <div className="bg-slate-900/60 border border-white/8 rounded-xl p-5 min-w-0">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function TooltipBox({ label, rows }: { label: string; rows: { name: string; value: string }[] }) {
  return (
    <div className="bg-slate-950/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {rows.map(r => (
        <p key={r.name} className="text-xs text-slate-100 font-mono tabular-nums">
          {r.value} <span className="text-slate-500 font-sans">{r.name}</span>
        </p>
      ))}
    </div>
  )
}

/** Nothing to plot is a real state, not an error. Say what would fill it. */
function EmptyPlot({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="flex items-center justify-center text-center px-6" style={{ height }}>
      <p className="text-xs text-slate-600 max-w-[36ch]">{children}</p>
    </div>
  )
}

/* ─── 1. Service curve ───────────────────────────────────────────────────── */

export type HourBucket = { label: string; hour: number; departures: number }

/** The day's departure profile, with a marker on the hour we are in now.
 *  This is the shape of a bus day - the morning push, the midday lull, the
 *  evening push - and it is the one thing a dispatcher cannot hold in their
 *  head at a glance. */
export function ServiceCurve({ data, nowLabel }: { data: HourBucket[]; nowLabel: string }) {
  const reduced = usePrefersReducedMotion()
  const total = data.reduce((n, d) => n + d.departures, 0)

  if (total === 0) {
    return (
      <EmptyPlot height={220}>
        No trips are scheduled to depart today. Add a schedule, or check the days
        your existing trips are set to run.
      </EmptyPlot>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label" tick={AXIS} axisLine={false} tickLine={false}
          interval={2} minTickGap={8}
        />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={`${payload[0].payload.label} – departures`}
                rows={[{ name: payload[0].payload.departures === 1 ? 'trip' : 'trips', value: String(payload[0].value) }]}
              />
            ) : null
          }
        />
        <ReferenceLine
          x={nowLabel} stroke={ACCENT} strokeDasharray="3 3" strokeOpacity={0.7}
          label={{ value: 'now', position: 'top', fill: ACCENT, fontSize: 10 }}
        />
        <Area
          type="monotone" dataKey="departures" stroke={ACCENT} strokeWidth={2}
          fill="url(#curveFill)" isAnimationActive={!reduced} animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── 2. Weekly coverage ─────────────────────────────────────────────────── */

export type DayBucket = { day: string; trips: number; isToday: boolean }

/** Which days actually have service. Gaps here are the point - an empty Sunday
 *  column is a business decision or an oversight, and both are worth seeing. */
export function WeeklyCoverage({ data }: { data: DayBucket[] }) {
  const reduced = usePrefersReducedMotion()

  if (data.every(d => d.trips === 0)) {
    return <EmptyPlot height={180}>No active trips yet. Once a schedule runs, its days show up here.</EmptyPlot>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -26, bottom: 0 }}>
        <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={payload[0].payload.day}
                rows={[{ name: payload[0].value === 1 ? 'trip' : 'trips', value: String(payload[0].value) }]}
              />
            ) : null
          }
        />
        <Bar dataKey="trips" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} animationDuration={500}>
          {data.map(d => (
            /* Today is the only bar that gets the accent. Everything else is
               context for it. */
            <Cell key={d.day} fill={d.isToday ? ACCENT : 'rgba(255,255,255,0.10)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── 3. Fleet status ────────────────────────────────────────────────────── */

export type FleetSlice = { name: string; value: number; color: string }

/** Where every bus in the fleet is right now. */
export function FleetDonut({ data, total }: { data: FleetSlice[]; total: number }) {
  const reduced = usePrefersReducedMotion()
  // Must be memoised. A fresh array on every render makes <Pie> restart its
  // enter animation, and the animation's own state update renders again -
  // which builds another fresh array. That loop hangs the tab.
  const shown = useMemo(() => data.filter(d => d.value > 0), [data])

  if (total === 0) {
    return (
      <EmptyPlot height={196}>
        No vehicles yet. Vehicle numbers come from your schedules - add a trip to
        put a bus on this chart.
      </EmptyPlot>
    )
  }

  return (
    <div className="relative" style={{ height: 196 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={shown} dataKey="value" nameKey="name"
            innerRadius={62} outerRadius={88} paddingAngle={2} strokeWidth={0}
            isAnimationActive={!reduced} animationDuration={600}
          >
            {shown.map(d => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={String(payload[0].name)}
                  rows={[{ name: payload[0].value === 1 ? 'bus' : 'buses', value: String(payload[0].value) }]}
                />
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label. A div rather than an SVG <text> so it inherits the type
          scale and stays crisp at any DPR. `pointer-events-none` keeps the
          slices hoverable underneath. */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-bold text-slate-100 font-mono tabular-nums leading-none">{total}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
            {total === 1 ? 'bus' : 'buses'}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── 4. Route load ──────────────────────────────────────────────────────── */

export type RouteLoad = { route: string; trips: number; fareCeiling: number }

/** Trips per route today. Horizontal because route numbers are labels, not a
 *  scale - and because the ranking is the message. */
export function RouteLoadBars({ data }: { data: RouteLoad[] }) {
  const reduced = usePrefersReducedMotion()

  if (data.length === 0) {
    return <EmptyPlot height={200}>No route is running today, so there is nothing to compare yet.</EmptyPlot>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category" dataKey="route" tick={AXIS} axisLine={false} tickLine={false}
          width={64}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={`Route ${payload[0].payload.route}`}
                rows={[
                  { name: payload[0].payload.trips === 1 ? 'trip today' : 'trips today', value: String(payload[0].payload.trips) },
                  { name: 'if every seat sold once', value: `₱${payload[0].payload.fareCeiling.toLocaleString('en-PH')}` },
                ]}
              />
            ) : null
          }
        />
        <Bar
          dataKey="trips" fill={ACCENT} fillOpacity={0.75} radius={[0, 4, 4, 0]}
          isAnimationActive={!reduced} animationDuration={500}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* Grid line export kept for callers that need to match axis styling. */
export { GRID }

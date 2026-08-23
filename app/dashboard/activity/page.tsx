'use client'

import { useMemo, useState } from 'react'
import { Megaphone, MapPin, Clock, Building2 } from 'lucide-react'
import { safeDateToMs, formatTimeAgo } from '@/utils/format'
import { ActivityItem, ActivityKind, AnyDoc } from '@/types'
import { useApi } from '@/lib/useApi'

/* Icon and wording per record type. Colour deliberately stays neutral - the
   dashboard reserves colour for status, so four accent hues here would read as
   decoration rather than meaning. The icon carries the distinction. */
const KINDS: Record<ActivityKind, { label: string; icon: typeof MapPin }> = {
  announcement: { label: 'Announcements', icon: Megaphone },
  route:        { label: 'Routes',        icon: MapPin },
  schedule:     { label: 'Schedules',     icon: Clock },
  terminal:     { label: 'Terminals',     icon: Building2 },
}

const KIND_ORDER = Object.keys(KINDS) as ActivityKind[]

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className ?? ''}`} />
)

/** "Today" / "Yesterday" / "12 March" - the grouping that turns a feed into a log. */
function dayLabel(tsMs: number): string {
  const d = new Date(tsMs)
  const now = new Date()
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const daysAgo = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return d.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<ActivityKind | 'all'>('all')

  // Four keys rather than one Promise.all: SWR runs them in parallel and caches
  // each under the key its own page already uses, so arriving here from Routes
  // or Terminals is instant instead of a fresh skeleton.
  const ann = useApi<AnyDoc[]>('/api/announcements', [])
  const rts = useApi<AnyDoc[]>('/api/routes', [])
  const sch = useApi<AnyDoc[]>('/api/schedules', [])
  const trm = useApi<AnyDoc[]>('/api/terminals', [])

  const loading = ann.isLoading || rts.isLoading || sch.isLoading || trm.isLoading
  const error = ann.error || rts.error || sch.error || trm.error

  const items = useMemo(() => {
    const announcements = ann.data
    const routes = rts.data
    const schedules = sch.data
    const terminals = trm.data
    const entries: ActivityItem[] = []

    /* One shape per collection. Records with no usable timestamp are
       skipped rather than dated to the epoch. */
    const push = (
      docs: AnyDoc[],
      kind: ActivityKind,
      idOf: (d: AnyDoc) => string,
      labelOf: (d: AnyDoc) => string,
    ) => {
      for (const d of docs) {
        const tsMs = safeDateToMs(d.updatedAt ?? d.createdAt)
        if (tsMs === null) continue
        entries.push({ key: `${kind}-${idOf(d)}-${tsMs}`, kind, label: labelOf(d), time: formatTimeAgo(tsMs), tsMs })
      }
    }

    push(announcements, 'announcement', d => String(d._id ?? d.title), d => `Announcement: ${String(d.title ?? 'Untitled')}`)
    push(routes, 'route', d => String(d._id), d => `Route updated: ${String(d.routeNumber ?? '—')}`)
    push(schedules, 'schedule', d => String(d._id), d =>
      d.route?.routeNumber
        ? `Schedule updated: ${d.route.routeNumber} · ${d.route.startPoint} → ${d.route.endPoint}`
        : 'Schedule updated: —',
    )
    push(terminals, 'terminal', d => String(d._id), d => `Terminal updated: ${String(d.name ?? 'Terminal')}`)

    entries.sort((a, b) => b.tsMs - a.tsMs)
    return entries
  }, [ann.data, rts.data, sch.data, trm.data])

  const counts = useMemo(() => {
    const c = { announcement: 0, route: 0, schedule: 0, terminal: 0 } as Record<ActivityKind, number>
    for (const i of items) c[i.kind]++
    return c
  }, [items])

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.kind === filter)),
    [items, filter],
  )

  /* Consecutive runs of the same day, in the order they already sort. */
  const groups = useMemo(() => {
    const out: { day: string; entries: ActivityItem[] }[] = []
    for (const item of visible) {
      const day = dayLabel(item.tsMs)
      if (out[out.length - 1]?.day === day) out[out.length - 1].entries.push(item)
      else out.push({ day, entries: [item] })
    }
    return out
  }, [visible])

  const chip = (active: boolean) =>
    `px-3 h-8 rounded-lg text-xs font-medium transition cursor-pointer border ${
      active
        ? 'bg-blue-600/15 border-blue-600/30 text-blue-400'
        : 'bg-white/3 border-white/8 text-slate-500 hover:text-slate-300 hover:bg-white/5'
    }`

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-1">Activity</h1>
        <p className="text-sm font-light text-slate-500">
          Every change made to your routes, schedules, terminals, and announcements
        </p>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('all')} className={chip(filter === 'all')}>
          All
          <span className="ml-1.5 font-mono tabular-nums text-slate-600">{items.length}</span>
        </button>
        {KIND_ORDER.map(kind => {
          const Icon = KINDS[kind].icon
          return (
            <button key={kind} onClick={() => setFilter(kind)} className={`${chip(filter === kind)} inline-flex items-center gap-1.5`}>
              <Icon className="w-3.5 h-3.5" />
              {KINDS[kind].label}
              <span className="font-mono tabular-nums text-slate-600">{counts[kind]}</span>
            </button>
          )
        })}
      </div>

      <div className="bg-slate-900/60 border border-white/8 rounded-xl p-5">
        {loading ? (
          <div className="space-y-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-6 h-6 rounded-md" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">
            {items.length === 0
              ? 'No activity yet. Changes to your routes, schedules, terminals, and announcements will show up here.'
              : `No ${KINDS[filter as ActivityKind].label.toLowerCase()} activity yet.`}
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.day}>
                <p className="text-[10px] font-medium tracking-wider uppercase text-slate-600 mb-2">
                  {group.day}
                </p>
                <div className="space-y-0.5">
                  {group.entries.map((item, i) => {
                    const Icon = KINDS[item.kind].icon
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between gap-4 py-2.5 ${
                          i < group.entries.length - 1 ? 'border-b border-white/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-white/5 border border-white/8 grid place-items-center shrink-0">
                            <Icon className="w-3 h-3 text-slate-400" />
                          </span>
                          <p className="text-sm text-slate-100 truncate">{item.label}</p>
                        </div>
                        <p className="text-xs text-slate-500 shrink-0 font-mono tabular-nums">{item.time}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

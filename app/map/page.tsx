'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin, Search, Clock, Bus,
  Building2, Ticket, Info, AlertTriangle, Bell, X, ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSocket } from '@/lib/socket'
import { Terminal, Route, Announcement, LiveBus } from '@/types'
import dynamic from 'next/dynamic'

// ── Dynamic import ──────────────────────────────────────────────────────────
const MapComponent = dynamic(() => import('@/components/map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900/60 animate-pulse" />,
})

// ── Constants ───────────────────────────────────────────────────────────────
const ROUTES_PER_PAGE        = 3
const TERMINALS_PER_PAGE     = 4
const ANNOUNCEMENTS_PER_PAGE = 5

const ANNOUNCEMENT_STYLES = {
  info:    { icon: Info,          bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',  badge: 'Info'    },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'Warning' },
  alert:   { icon: Bell,          bg: 'bg-red-500/10',   border: 'border-red-500/20',   text: 'text-red-400',   badge: 'Alert'   },
} as const

// ── Pagination ──────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  total: number
  onPrev: () => void
  onNext: () => void
  label?: string
}

function Pagination({ page, total, onPrev, onNext, label }: PaginationProps) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between pt-2 border-t border-white/5">
      {label && <p className="text-xs text-slate-600">{label}</p>}
      <div className="flex gap-1.5 ml-auto">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="h-6 px-2.5 text-xs bg-white/5 border border-white/10 text-slate-400 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          ←
        </button>
        <button
          onClick={onNext}
          disabled={page === total}
          className="h-6 px-2.5 text-xs bg-white/5 border border-white/10 text-slate-400 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          →
        </button>
      </div>
    </div>
  )
}

// ── Tab ─────────────────────────────────────────────────────────────────────
function Tab({
  active, onClick, children, count,
}: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap ${
        active
          ? 'bg-blue-600/15 border border-blue-600/30 text-blue-400'
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`font-mono text-[10px] ${active ? 'text-blue-500' : 'text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [terminals,            setTerminals]            = useState<Terminal[]>([])
  const [routes,               setRoutes]               = useState<Route[]>([])
  const [announcements,        setAnnouncements]        = useState<Announcement[]>([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [loading,              setLoading]              = useState(true)
  const [searchQuery,          setSearchQuery]          = useState('')
  const [filteredRoutes,       setFilteredRoutes]       = useState<Route[]>([])
  const [selectedTerminal,     setSelectedTerminal]     = useState<Terminal | null>(null)
  const [expandedRouteId,      setExpandedRouteId]      = useState<string | null>(null)
  const [currentPage,          setCurrentPage]          = useState(1)
  const [terminalSearch,       setTerminalSearch]       = useState('')
  const [terminalPage,         setTerminalPage]         = useState(1)
  const [announcementPage,     setAnnouncementPage]     = useState(1)
  const [liveBuses,            setLiveBuses]            = useState<Map<string, LiveBus>>(new Map())
  const [activeTab,            setActiveTab]            = useState<'routes' | 'terminals' | 'alerts'>('routes')

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    socket.on('bus:snapshot', (buses: LiveBus[]) =>
      setLiveBuses(new Map(buses.map(b => [b.scheduleId, b])))
    )
    socket.on('bus:location', (bus: LiveBus) =>
      setLiveBuses(prev => new Map(prev).set(bus.scheduleId, bus))
    )
    socket.on('bus:removed', (scheduleId: string) =>
      setLiveBuses(prev => { const n = new Map(prev); n.delete(scheduleId); return n })
    )
    return () => {
      socket.off('bus:snapshot')
      socket.off('bus:location')
      socket.off('bus:removed')
    }
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [tRes, rRes, aRes] = await Promise.all([
        fetch('/api/public/terminals'),
        fetch('/api/public/routes'),
        fetch('/api/public/announcements'),
      ])
      const tData = tRes.ok ? await tRes.json() : []
      const rData = rRes.ok ? await rRes.json() : []
      const aData = aRes.ok ? await aRes.json() : []
      setTerminals(Array.isArray(tData) ? tData : [])
      setRoutes(Array.isArray(rData) ? rData : [])
      setFilteredRoutes(Array.isArray(rData) ? rData : [])
      setAnnouncements(Array.isArray(aData) ? aData : [])
    } catch (e) {
      console.error('Fetch failed:', e)
      setTerminals([]); setRoutes([]); setFilteredRoutes([]); setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredTerminals = terminals.filter(t =>
    t.name.toLowerCase().includes(terminalSearch.toLowerCase()) ||
    t.location.toLowerCase().includes(terminalSearch.toLowerCase())
  )

  const totalPages             = Math.ceil(filteredRoutes.length    / ROUTES_PER_PAGE)
  const totalTerminalPages     = Math.ceil(filteredTerminals.length / TERMINALS_PER_PAGE)
  const totalAnnouncementPages = Math.ceil(announcements.length     / ANNOUNCEMENTS_PER_PAGE)

  const paginatedRoutes        = filteredRoutes.slice(   (currentPage      - 1) * ROUTES_PER_PAGE,        currentPage      * ROUTES_PER_PAGE)
  const paginatedTerminals     = filteredTerminals.slice((terminalPage     - 1) * TERMINALS_PER_PAGE,     terminalPage     * TERMINALS_PER_PAGE)
  const paginatedAnnouncements = announcements.slice(    (announcementPage - 1) * ANNOUNCEMENTS_PER_PAGE, announcementPage * ANNOUNCEMENTS_PER_PAGE)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    setExpandedRouteId(null)
    if (!query.trim()) { setFilteredRoutes(routes); return }
    const q = query.toLowerCase()
    setFilteredRoutes(routes.filter(r =>
      r.routeNumber.toLowerCase().includes(q) ||
      r.startPoint.toLowerCase().includes(q)  ||
      r.endPoint.toLowerCase().includes(q)
    ))
  }

  const toggleExpand = (id: string) =>
    setExpandedRouteId(prev => prev === id ? null : id)


  return (
    /**
     * Root: flex column so nav + body stack vertically.
     * On lg+: body fills remaining viewport height (sidebar + map side-by-side).
     * On mobile: body is normal flow (sidebar on top, map below).
     */
    <div className="min-h-screen text-slate-100 flex flex-col bg-slate-950">

      {/* ── NAV ── */}
      <nav className="shrink-0 z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-md">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
           <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {announcements.length > 0 && (
              <button
                onClick={() => setActiveTab('alerts')}
                className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-amber-500/15 transition"
              >
                <Bell className="w-3 h-3" />
                <span className="hidden sm:inline">{announcements.length} alert{announcements.length !== 1 ? 's' : ''}</span>
                <span className="sm:hidden">{announcements.length}</span>
              </button>
            )}
            <Button asChild size="sm" className="h-8 px-2.5 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs">
              <Link href="/register">
                <span className="">Sign Up</span>

              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/**
       * Body wrapper:
       *   - Mobile:  flex-col — sidebar stacks above map
       *   - Desktop: flex-row + overflow-hidden + fills remaining vh
       */}
      <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden lg:h-[calc(100vh-56px)]">

        {/* ── SIDEBAR ── */}
        {/**
         * Mobile:  full width, no height constraint (page scrolls naturally)
         * Desktop: fixed width 380px, full height, internal scroll
         */}
        <aside className="
          w-full flex flex-col
          border-b border-white/5
          bg-slate-950
          lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r lg:overflow-hidden
        ">
          {/* Search */}
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
            <p className="text-[10px] font-mono font-medium tracking-widest uppercase text-slate-600 mb-2">
              Route & Schedule Finder
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Route number, origin, or destination..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-9 pr-8 h-10 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-none">
            <Tab active={activeTab === 'routes'}    onClick={() => setActiveTab('routes')}    count={filteredRoutes.length}>
              <Bus className="w-3 h-3" /> Routes
            </Tab>
            <Tab active={activeTab === 'terminals'} onClick={() => setActiveTab('terminals')} count={terminals.length}>
              <MapPin className="w-3 h-3" /> Terminals
            </Tab>
            {announcements.length > 0 && (
              <Tab active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} count={announcements.length}>
                <Bell className="w-3 h-3" /> Alerts
              </Tab>
            )}
          </div>

          {/**
           * Scrollable content area:
           *   - Mobile:  no height constraint, renders naturally, page scrolls
           *   - Desktop: flex-1 + overflow-y-auto to scroll inside the sidebar
           */}
          <div className="lg:flex-1 lg:overflow-y-auto">

            {/* ROUTES */}
            {activeTab === 'routes' && (
              <div className="p-3 space-y-2">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-900/60 border border-white/5 rounded-xl animate-pulse" />
                  ))
                ) : filteredRoutes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin className="w-8 h-8 text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500">No routes match your search.</p>
                    <button
                      onClick={() => handleSearch('')}
                      className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <>
                    {paginatedRoutes.map(route => {
                      const isExpanded = expandedRouteId === route._id
                      const schedules  = route.schedules ?? []
                      const minFare    = schedules.length > 0
                        ? Math.min(...schedules.map(s => s.fare))
                        : null

                      return (
                        <div
                          key={route._id}
                          className="bg-slate-900/50 border border-white/8 rounded-xl overflow-hidden hover:border-blue-600/30 transition"
                        >
                          <button
                            onClick={() => route._id && toggleExpand(route._id)}
                            aria-expanded={isExpanded}
                            className="cursor-pointer w-full text-left px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-sm font-bold text-blue-500">{route.routeNumber}</span>
                                  <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                    {route.distance} km
                                  </span>
                                  {route.companyName && (
                                    <span className="flex items-center gap-1 text-[10px] text-slate-600">
                                      <Building2 className="w-2.5 h-2.5" />
                                      {route.companyName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-300 font-medium truncate mb-1">
                                  {route.startPoint}
                                  <span className="text-slate-600 mx-1.5">→</span>
                                  {route.endPoint}
                                </p>
                                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {route.estimatedTime}
                                  </span>
                                  {minFare !== null && (
                                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                      <Ticket className="w-2.5 h-2.5" />
                                      from ₱{minFare}
                                    </span>
                                  )}
                                  <span className="text-slate-700">
                                    {schedules.length} trip{schedules.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-600 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          <div className="collapse-panel" data-open={isExpanded} inert={!isExpanded}>
                            <div className="border-t border-white/5 px-4 pb-3 pt-2 space-y-1.5">
                              <p className="text-[10px] font-medium tracking-wider uppercase text-slate-600 mb-2">
                                Available Trips
                              </p>
                              {schedules.length === 0 ? (
                                <p className="text-xs text-slate-600">No active trips.</p>
                              ) : (
                                schedules.map(sched => (
                                  <div
                                    key={sched._id}
                                    className="flex items-center justify-between gap-2 bg-white/3 border border-white/5 rounded-lg px-3 py-2"
                                  >
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 min-w-0">
                                      <Clock className="w-3 h-3 text-slate-600 shrink-0" />
                                      <span className="truncate">
                                        {sched.departureTime}
                                        <span className="text-slate-700 mx-1">→</span>
                                        {sched.arrivalTime}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">{sched.vehicleNumber}</span>
                                      <span className="text-xs font-semibold text-emerald-400">₱{sched.fare}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        {sched.status}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <div className="pt-1">
                      <Pagination
                        page={currentPage}
                        total={totalPages}
                        onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                        onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        label={`${currentPage} / ${totalPages} · ${filteredRoutes.length} routes`}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TERMINALS */}
            {activeTab === 'terminals' && (
              <div className="p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter terminals..."
                    value={terminalSearch}
                    onChange={e => { setTerminalSearch(e.target.value); setTerminalPage(1) }}
                    className="w-full pl-7 pr-3 h-8 bg-white/5 border border-white/10 rounded-lg text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60 transition"
                  />
                </div>

                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-slate-900/60 border border-white/5 rounded-xl animate-pulse" />
                  ))
                ) : filteredTerminals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <MapPin className="w-6 h-6 text-slate-700 mb-2" />
                    <p className="text-xs text-slate-500">No terminals found.</p>
                  </div>
                ) : (
                  <>
                    {paginatedTerminals.map(terminal => (
                      <button
                        key={terminal._id}
                        onClick={() => setSelectedTerminal(prev =>
                          prev?._id === terminal._id ? null : terminal
                        )}
                        className={`cursor-pointer w-full text-left px-4 py-3 rounded-xl border transition flex items-center gap-3 ${
                          selectedTerminal?._id === terminal._id
                            ? 'bg-blue-600/10 border-blue-600/40'
                            : 'bg-slate-900/50 border-white/8 hover:border-blue-600/30 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedTerminal?._id === terminal._id
                            ? 'bg-blue-600/20 border border-blue-600/30'
                            : 'bg-white/5 border border-white/10'
                        }`}>
                          <MapPin className={`w-3.5 h-3.5 ${
                            selectedTerminal?._id === terminal._id ? 'text-blue-400' : 'text-slate-500'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${
                            selectedTerminal?._id === terminal._id ? 'text-blue-300' : 'text-slate-300'
                          }`}>
                            {terminal.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{terminal.location}</p>
                        </div>
                        {selectedTerminal?._id === terminal._id && (
                          <span className="shrink-0 text-[10px] text-blue-500 font-medium">On map ↗</span>
                        )}
                      </button>
                    ))}

                    <Pagination
                      page={terminalPage}
                      total={totalTerminalPages}
                      onPrev={() => setTerminalPage(p => Math.max(1, p - 1))}
                      onNext={() => setTerminalPage(p => Math.min(totalTerminalPages, p + 1))}
                      label={`${terminalPage} / ${totalTerminalPages}`}
                    />
                  </>
                )}
              </div>
            )}

            {/* ALERTS */}
            {activeTab === 'alerts' && (
              <div className="p-3 space-y-2">
                {paginatedAnnouncements.map(a => {
                  const style = ANNOUNCEMENT_STYLES[a.type]
                  const Icon  = style.icon
                  return (
                    <button
                      key={a._id}
                      onClick={() => setSelectedAnnouncement(a)}
                      className={`cursor-pointer w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border} hover:opacity-80 transition`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-semibold ${style.text}`}>{a.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style.bg} ${style.border} ${style.text}`}>
                            {style.badge}
                          </span>
                          {a.companyName && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-600">
                              <Building2 className="w-2.5 h-2.5" />
                              {a.companyName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{a.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">
                        {a.createdAt
                          ? new Date(a.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                    </button>
                  )
                })}

                <Pagination
                  page={announcementPage}
                  total={totalAnnouncementPages}
                  onPrev={() => setAnnouncementPage(p => Math.max(1, p - 1))}
                  onNext={() => setAnnouncementPage(p => Math.min(totalAnnouncementPages, p + 1))}
                  label={`${announcementPage} / ${totalAnnouncementPages} · ${announcements.length} alerts`}
                />
              </div>
            )}
          </div>
        </aside>

        {/* ── MAP ── */}
        {/**
         * Mobile:  fixed height so it's visible without scrolling too far
         * Desktop: flex-1 fills the remaining space beside the sidebar
         */}
      <div className="relative bg-slate-900/40 min-w-0 h-[60vh] sm:h-[70vh] lg:h-auto lg:flex-1">

          {/* Selected terminal chip */}
          {selectedTerminal && (
            <div className="absolute top-3 right-3 z-10 max-w-[45%] sm:max-w-[200px]">
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-blue-600/30 px-2.5 py-1.5 rounded-full backdrop-blur-sm shadow-lg">
                <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="text-xs text-blue-300 font-medium truncate">{selectedTerminal.name}</span>
                <button
                  onClick={() => setSelectedTerminal(null)}
                  className="text-slate-600 hover:text-slate-400 transition ml-0.5 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <MapComponent
            terminals={terminals}
            routes={routes}
            selectedTerminal={selectedTerminal}
            onSelectTerminal={setSelectedTerminal}
            liveBuses={Array.from(liveBuses.values())}
          />
        </div>
      </div>

      {/* ── ANNOUNCEMENT MODAL ── */}
      {selectedAnnouncement && (() => {
        const a     = selectedAnnouncement
        const style = ANNOUNCEMENT_STYLES[a.type]
        const Icon  = style.icon  
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedAnnouncement(null)}
          >
            <div
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg} border ${style.border}`}>
                    <Icon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${style.text}`}>{a.title}</p>
                    {a.companyName && (
                      <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {a.companyName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs px-2 py-0.5 rounded border ${style.bg} ${style.border} ${style.text}`}>
                  {style.badge}
                </span>
                <span className="text-xs text-slate-600">
                  {a.createdAt
                    ? new Date(a.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                    : ''}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">{a.message}</p>

              {a.affectedRoutes.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-2">Affected Routes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.affectedRoutes.map(r => (
                      <span key={r} className="text-xs font-mono bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
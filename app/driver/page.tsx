'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bus, MapPin, Square, Navigation, ArrowLeft } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { Schedule } from '@/types'
import Link from 'next/link'

function DriverPageContent() {
  const searchParams  = useSearchParams()
  // The signed trip token IS the driver's credential - drivers have no accounts.
  // The operator generates it from the dashboard and sends the link.
  const token         = searchParams.get('token')

  // Decoded only to look up schedule details for display. The signature is
  // verified server-side; nothing here is trusted.
  const scheduleId = useMemo(() => {
    if (!token) return null
    try {
      const payload = token.split('.')[1]
      if (!payload) return null
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      return (JSON.parse(json).scheduleId as string) ?? null
    } catch {
      return null
    }
  }, [token])

  const [schedule, setSchedule]       = useState<(Schedule & { companyName?: string }) | null>(null)
  const [tracking, setTracking]       = useState(false)
  const [status, setStatus]           = useState<'idle' | 'locating' | 'live' | 'error'>('idle')
  const [accuracy, setAccuracy]       = useState<number | null>(null)
  const [lastSent, setLastSent]       = useState<string | null>(null)
  const watchIdRef                    = useRef<number | null>(null)
  const scheduleRef = useRef<(Schedule & { companyName?: string }) | null>(null)

  useEffect(() => {
  scheduleRef.current = schedule
}, [schedule])


  // Fetch schedule info
  useEffect(() => {
    if (!scheduleId) return
    fetch(`/api/public/schedules/${scheduleId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSchedule(data) })
      .catch(console.error)
  }, [scheduleId])

  const startTracking = () => {
    if (!token || !scheduleId || !navigator.geolocation) {
      setStatus('error')
      return
    }
    setStatus('locating')
    setTracking(true)
    const socket = getSocket()

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('live')
        setAccuracy(Math.round(pos.coords.accuracy))
        setLastSent(new Date().toLocaleTimeString('en-PH'))
        // Only the token and the coordinates. Vehicle, route and company are
        // read from the token server-side so this client cannot claim to be a
        // different bus.
        socket.emit('driver:location', {
          token,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      (err) => {
        console.error('Geolocation error:', err)
        setStatus('error')
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    const socket = getSocket()
    if (token) socket.emit('driver:end', token)
    setTracking(false)
    setStatus('idle')
    setLastSent(null)
  }

  const statusConfig = {
    idle:     { label: 'Not tracking',  dot: 'bg-slate-500' },
    locating: { label: 'Getting GPS…',  dot: 'bg-amber-400 animate-pulse' },
    live:     { label: 'Live',          dot: 'bg-emerald-400 animate-pulse' },
    error:    { label: 'GPS error',     dot: 'bg-red-400' },
  }

  const s = statusConfig[status]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-10">
        <Link href ="/">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Bus className="w-4 h-4 text-white" />
        </div>
        </Link>
        <span className="text-lg font-bold">
          Tran<span className="text-blue-500">Sync</span> PH
          <span className="ml-2 text-sm font-normal text-slate-500">· Driver</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-900/60 border border-white/8 rounded-2xl p-6 space-y-6">

        {/* Schedule info */}
        {!scheduleId ? (
          <div className="text-center py-4">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">
              {token ? 'This driver link is not valid' : 'No driver link'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {token
                ? 'It may have expired. Ask your operator for a new one.'
                : 'Open the link sent by your operator.'}
            </p>
          </div>
        ) : schedule ? (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wider uppercase text-slate-500">Your Trip</p>
            <p className="text-base font-semibold text-slate-100">{schedule.vehicleNumber}</p>
            <p className="text-sm text-slate-400">
              {schedule.departureTime} → {schedule.arrivalTime}
            </p>
            {schedule.routeNumber && (
              <span className="inline-block text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                Route {schedule.routeNumber}
              </span>
            )}
          </div>
        ) : (
          <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          <span className="text-sm text-slate-300">{s.label}</span>
          {lastSent && (
            <span className="ml-auto text-xs text-slate-600">Last: {lastSent}</span>
          )}
        </div>

        {accuracy !== null && (
          <p className="text-xs text-slate-600 -mt-4 px-1">
            GPS accuracy: ±{accuracy}m
          </p>
        )}

        {/* Action button */}
        {!tracking ? (
          <button
            onClick={startTracking}
            disabled={!scheduleId}
            className=" cursor-pointer w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base flex items-center justify-center gap-2 transition"
          >
            <Navigation className="w-5 h-5" />
            Start Trip
          </button>
          
        ) : (
          <button
            onClick={stopTracking}
            className="cursor-pointer w-full h-14 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-semibold text-base flex items-center justify-center gap-2 transition"
          >
            <Square className="w-5 h-5" />
            End Trip
          </button>
        )}

        <p className="text-xs text-slate-600 text-center">
          Keep this page open while driving. Do not close the browser.
        </p>
      </div>
      <br/>
      <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to map
            </Link>
    </div>
  )
}

export default function DriverPage() {
  return (
    <Suspense fallback={
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  }>
      <DriverPageContent />
    </Suspense>
  )
}
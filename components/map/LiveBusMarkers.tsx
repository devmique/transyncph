'use client'

import { Marker, Tooltip } from 'react-leaflet'
import { Radio, Bus, Building2 } from 'lucide-react'
import { LiveBus } from '@/types'
import { busIcon } from './icons'

export default function LiveBusMarkers({ liveBuses }: { liveBuses: LiveBus[] }) {
  return (
    <>
      {liveBuses.map((bus) => (
        <Marker
          key={bus.scheduleId}
          position={[bus.lat, bus.lng]}
          icon={busIcon(bus.vehicleNumber)}
        >
          <Tooltip
            direction="top"
            offset={[0, -22]}
            opacity={1}
            className="custom-map-tooltip"
          >
            <div className="bg-slate-950/95 border border-emerald-500/30 text-slate-100 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-xs space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Live GPS
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">Active Stream</span>
              </div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{bus.vehicleNumber ?? 'Bus Unit'}</span>
              </div>
              {bus.companyName && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                  <span className="truncate">{bus.companyName}</span>
                </div>
              )}
              <div className="pt-1 border-t border-white/5 text-[9px] font-mono text-slate-500">
                Lat: {bus.lat.toFixed(4)} • Lng: {bus.lng.toFixed(4)}
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}
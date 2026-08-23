'use client'

import { Marker, Tooltip } from 'react-leaflet'
import { MapPin, Navigation } from 'lucide-react'
import { Terminal } from '@/types'
import { terminalIcon } from './icons'

interface Props {
  terminals: Terminal[]
  onSelectTerminal: (terminal: Terminal) => void
}

export default function TerminalMarkers({ terminals, onSelectTerminal }: Props) {
  return (
    <>
      {terminals.map((terminal) => (
        <Marker
          key={terminal._id}
          position={[terminal.lat, terminal.lng]}
          icon={terminalIcon}
          eventHandlers={{ click: () => onSelectTerminal(terminal) }}
        >
          <Tooltip
            direction="top"
            offset={[0, -28]}
            opacity={1}
            className="custom-map-tooltip"
          >
            <div className="bg-slate-950/95 border border-blue-500/30 text-slate-100 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-xs space-y-1.5 transition-all">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit">
                <MapPin className="w-2.5 h-2.5" />
                Terminal Hub
              </div>
              <div className="text-xs font-bold text-slate-100 tracking-tight leading-tight">
                {terminal.name}
              </div>
              <div className="text-[11px] text-slate-400 font-light flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                <span className="truncate">{terminal.location}</span>
              </div>
              <div className="pt-1 border-t border-white/5 text-[9px] font-mono text-slate-500 flex items-center justify-between gap-2">
                <span>{terminal.lat.toFixed(2)}°, {terminal.lng.toFixed(2)}°</span>
                <span className="text-blue-400 font-semibold">Click to focus →</span>
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}
/* The hero visual. A stretch of coast with a bus network running across it:
 * one corridor, one feeder, one spur.
 *
 * Deliberately not the live map: no fetch, no socket, no Leaflet, no tile
 * requests. It ships with the HTML and paints on the first frame. The real
 * map is one click away at /map.
 *
 * Two rules hold this together. The land runs off the edges of the plate, so
 * it reads as a viewport onto somewhere larger. And the only things drawn are
 * geography and the network — an earlier pass had streets, city blocks, a
 * compass and a scale bar, and a visitor read none of it in the two seconds
 * they give a hero. */

import { SEA, ISLANDS, LAKE, RIVER, CORRIDOR, FEEDER, SPUR } from './map-geometry'

/* Offsets are in cqw so the labels track the plate as it narrows. Fixed px
   offsets crowded the nodes on a phone, where the map is a third the width
   but the type was not. Short names for the same reason. */
/* `d` is the millisecond mark each point lands on: a terminal appears as the
   line being drawn actually reaches it, rather than everything arriving at
   once. */
const NODES = [
  { x: 150, y: 96, r: 8, label: 'North Terminal', short: 'North', dx: '2.6cqw', dy: '0px', anchor: 'start' as const, d: 260 },
  { x: 300, y: 200, r: 12, label: 'Central Hub', short: 'Central', dx: '0px', dy: '-4.4cqw', anchor: 'middle' as const, primary: true, d: 820 },
  { x: 480, y: 276, r: 8, label: 'Port Terminal', short: 'Port', dx: '0px', dy: '3.9cqw', anchor: 'middle' as const, d: 1400 },
  { x: 168, y: 330, r: 8, label: 'South Terminal', short: 'South', dx: '0px', dy: '3.9cqw', anchor: 'middle' as const, d: 340 },
]

const STOPS = [
  [178, 168, 430],
  [348, 254, 1060],
  [210, 280, 700],
]

const SHIFT = {
  start: 'translateY(-50%)',
  middle: 'translate(-50%, -50%)',
  end: 'translate(-100%, -50%)',
}

export default function NetworkMapVisual() {
  return (
    /* Double-bezel: outer tray, inner plate, concentric radii. */
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-1.5 sm:p-2 shadow-2xl shadow-black/50">
      <div className="relative overflow-hidden rounded-[calc(2rem-0.5rem)] border border-white/[0.07] bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">

        {/* ── Header strip ── */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 sm:px-5 h-12">
          <p className="text-[10px] font-mono font-medium uppercase tracking-[0.22em] text-slate-500">
            Network map
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="h-[3px] w-5 rounded-full bg-blue-400" />
              <span className="text-[10px] font-mono tracking-wide text-slate-500">Corridor</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-[3px] w-5 rounded-full bg-slate-600" />
              <span className="text-[10px] font-mono tracking-wide text-slate-500">Feeder</span>
            </span>
          </div>
        </div>

        {/* ── Map plate ── */}
        <div className="relative aspect-[16/10] [container-type:inline-size]">
          <svg
            viewBox="0 0 640 400"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <pattern id="nm-graticule" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
              <linearGradient id="nm-sea" x1="0.2" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#061426" />
                <stop offset="100%" stopColor="#030a15" />
              </linearGradient>
              <radialGradient id="nm-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              {/* Relief. Tonal only — no edges, so the land gains depth
                  without gaining anything the eye has to count. */}
              <radialGradient id="nm-high" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nm-low" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="nm-corridor" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>

            {/* Land is the ground; the sea is cut out of it */}
            <rect width="640" height="400" fill="#1a2a42" />

            {/* Uplands and lowlands, before the water is laid over the top */}
            <g>
              <ellipse cx="132" cy="120" rx="170" ry="130" fill="url(#nm-high)" />
              <ellipse cx="408" cy="164" rx="150" ry="112" fill="url(#nm-high)" />
              <ellipse cx="236" cy="352" rx="190" ry="130" fill="url(#nm-low)" />
              <ellipse cx="560" cy="60" rx="130" ry="96" fill="url(#nm-low)" />
            </g>

            <g>
              {/* Shore halo first, so the glow sits on the water side */}
              <path d={SEA} fill="url(#nm-sea)" stroke="rgba(56,189,248,0.1)" strokeWidth="10" />
              <path d={SEA} fill="url(#nm-sea)" stroke="rgba(125,211,252,0.4)" strokeWidth="1.25" />
              {ISLANDS.map((d) => (
                <path key={d.slice(0, 24)} d={d} fill="#1a2a42" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
              ))}
              <path d={LAKE} fill="url(#nm-sea)" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* Valley floor, then the water itself */}
                <path d={RIVER} stroke="rgba(56,189,248,0.07)" strokeWidth="9" />
                <path d={RIVER} stroke="rgba(125,211,252,0.34)" strokeWidth="2.5" />
              </g>
            </g>

            {/* Graticule over everything, the way a chart is ruled */}
            <rect width="640" height="400" fill="url(#nm-graticule)" />

            <circle cx="300" cy="200" r="215" fill="url(#nm-glow)" />

            {/* Spur — unlabelled, so the hub reads as a hub */}
            <path
              className="netmap-draw netmap-draw-spur"
              pathLength="1"
              d={SPUR}
              fill="none"
              stroke="#3d5573"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              className="netmap-pop"
              style={{ '--d': 1100 } as React.CSSProperties}
              cx="366"
              cy="316"
              r="4"
              fill="#0d1a2b"
              stroke="#5b7796"
              strokeWidth="1.5"
            />

            {/* Feeder */}
            <g fill="none" strokeLinecap="round">
              <path className="netmap-draw netmap-draw-feeder" pathLength="1" d={FEEDER} stroke="rgba(148,163,184,0.12)" strokeWidth="12" />
              <path className="netmap-draw netmap-draw-feeder" pathLength="1" d={FEEDER} stroke="#7d8ea4" strokeWidth="2.5" />
            </g>

            {/* Corridor */}
            <g fill="none" strokeLinecap="round">
              <path className="netmap-draw netmap-draw-corridor" pathLength="1" d={CORRIDOR} stroke="rgba(59,130,246,0.2)" strokeWidth="18" />
              <path className="netmap-draw netmap-draw-corridor" pathLength="1" d={CORRIDOR} stroke="url(#nm-corridor)" strokeWidth="3.5" />
            </g>

            {/* Stops */}
            {STOPS.map(([x, y, d]) => (
              <circle
                key={`${x}-${y}`}
                className="netmap-pop"
                style={{ '--d': d } as React.CSSProperties}
                cx={x}
                cy={y}
                r="4"
                fill="#0d1a2b"
                stroke="rgba(203,213,225,0.85)"
                strokeWidth="1.75"
              />
            ))}

            {/* Terminals */}
            {NODES.map((n) => (
              <g key={n.label} className="netmap-pop" style={{ '--d': n.d } as React.CSSProperties}>
                {n.primary && (
                  <circle
                    className="netmap-ping"
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 6}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="1.25"
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill="#0d1a2b"
                  stroke={n.primary ? '#60a5fa' : '#e2e8f0'}
                  strokeWidth="2.5"
                />
                <circle cx={n.x} cy={n.y} r={n.r - 4} fill={n.primary ? '#60a5fa' : '#cbd5e1'} />
              </g>
            ))}

            {/* Buses riding the lines. CSS offset-path only — no JS. */}
            <g className="netmap-bus netmap-bus-main">
              <circle r="12" fill="#60a5fa" fillOpacity="0.22" />
              <rect x="-5.5" y="-7" width="11" height="14" rx="3.5" fill="#dbeafe" />
              <rect x="-3.5" y="-4.5" width="7" height="4.25" rx="1.25" fill="#1d4ed8" />
            </g>
            <g className="netmap-bus netmap-bus-feeder">
              <circle r="10" fill="#94a3b8" fillOpacity="0.2" />
              <rect x="-4.5" y="-6" width="9" height="12" rx="3" fill="#e2e8f0" />
              <rect x="-3" y="-4" width="6" height="3.75" rx="1.25" fill="#334155" />
            </g>
          </svg>

          {/* Labels in HTML so they stay crisp instead of scaling with the viewBox */}
          {NODES.map((n) => (
            <p
              key={n.label}
              className={`netmap-label pointer-events-none absolute whitespace-nowrap font-medium tracking-tight drop-shadow-[0_1px_4px_rgba(5,12,23,0.95)] ${
                n.primary ? 'text-slate-100' : 'text-slate-300'
              }`}
              style={{
                left: `calc(${(n.x / 640) * 100}% + ${n.dx})`,
                top: `calc(${(n.y / 400) * 100}% + ${n.dy})`,
                transform: SHIFT[n.anchor],
                fontSize: 'clamp(10px, 2.05cqw, 12.5px)',
                '--d': n.d + 120,
              } as React.CSSProperties}
            >
              <span className="sm:hidden">{n.short}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </p>
          ))}

          {/* Sea label, set the way a cartographer sets one */}
          <p className="pointer-events-none absolute right-[5%] top-[60%] hidden sm:block -rotate-[8deg] text-[10px] font-light uppercase tracking-[0.4em] text-sky-300/30">
            Sea
          </p>

          {/* Vignette so the plate falls away at the edges */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_70%,rgba(3,7,15,0.5)_100%)]" />
        </div>

        {/* ── Footer strip ── */}
        <div className="border-t border-white/[0.07] px-4 sm:px-5 py-3">
          <p className="text-[11px] font-light text-slate-500">
            Illustrative. Your real routes and terminals go on the live commuter map.
          </p>
        </div>
      </div>
    </div>
  )
}

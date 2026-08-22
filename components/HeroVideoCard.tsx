"use client"
import { useEffect, useRef } from 'react'
import { Play } from 'lucide-react'

// EASE: how hard the button chases the cursor (1 = glued, lower = laggier).
// EDGE: keep the button at least this far inside the card so it never clips.
const EASE = 0.18
const EDGE = 44

/**
 * Hero product-walkthrough card. The whole card is the play control, and the
 * play button follows the cursor while the pointer is over it, easing back to
 * centre on leave.
 *
 * Position is held in refs and written straight to style.transform, so this
 * never re-renders. Transform-only, so the compositor handles every frame.
 */
export default function HeroVideoCard({ onOpen }: { onOpen: () => void }) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const dot = dotRef.current
    if (!card || !dot) return

    // No cursor to follow on touch, and no motion at all if the user opted out.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let raf = 0

    const draw = () => {
      cx += (tx - cx) * EASE
      cy += (ty - cy) * EASE
      if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) {
        dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
        raf = requestAnimationFrame(draw)
      } else {
        // Snap to the exact target and stop, so the loop does not spin idle.
        cx = tx
        cy = ty
        dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
        raf = 0
      }
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect()
      const maxX = Math.max(0, r.width / 2 - EDGE)
      const maxY = Math.max(0, r.height / 2 - EDGE)
      tx = Math.min(maxX, Math.max(-maxX, e.clientX - (r.left + r.width / 2)))
      ty = Math.min(maxY, Math.max(-maxY, e.clientY - (r.top + r.height / 2)))
      kick()
    }

    const onLeave = () => {
      tx = 0
      ty = 0
      kick()
    }

    // Hide the real pointer only once we know the button is actually following
    // it. Set here rather than in className so that when the guards above bail
    // out, reduced-motion and touch users keep a normal visible cursor instead
    // of losing their pointer over this card.
    card.style.cursor = 'none'

    card.addEventListener('pointermove', onMove, { passive: true })
    card.addEventListener('pointerleave', onLeave)

    return () => {
      card.style.cursor = ''
      card.removeEventListener('pointermove', onMove)
      card.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <button
      ref={cardRef}
      onClick={onOpen}
      className="group relative block w-full rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl shadow-blue-950/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      aria-label="Play the TranSync PH product walkthrough"
    >
      <video
        className="w-full aspect-video object-cover"
        src="/demo.mp4#t=30"
        preload="metadata"
        muted
        playsInline
        tabIndex={-1}
      />
      <span className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/15 transition" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span ref={dotRef} className="will-change-transform">
          <span className="flex w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-900/50 group-hover:scale-105 transition">
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
          </span>
        </span>
      </span>
      <span className="absolute bottom-3 left-4 text-xs font-medium text-slate-300">
        Product walkthrough
      </span>
    </button>
  )
}

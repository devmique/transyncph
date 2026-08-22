"use client"
import { useEffect, useRef } from 'react'

// Tuning knobs.
// RADIUS  = size of the reveal window around the cursor.
// GRID    = grid cell size in px (40 matches the original background).
// GRID_A  = grid line opacity. Higher than the old 0.03 because the lines are
//           only ever seen inside the window and need to actually read there.
// GLOW_A  = blue tint at the centre of the window.
const RADIUS = 300
const GRID = 40
const GRID_A = 0.07
const GLOW_A = 0.16

/**
 * The original grid-and-glow background, hidden by default and revealed through
 * a soft circular window that follows the cursor.
 *
 * The grid is painted across the whole fixed layer so it stays anchored to the
 * page, and a radial mask centred on the pointer decides how much of it shows.
 * Moving the mask is what creates the effect.
 *
 * ponytail: moving a mask repaints this one fixed layer each frame, unlike a
 * pure transform. That is the price of keeping the grid anchored while the
 * window moves; transform-only alternatives drag the grid along with it. Writes
 * are coalesced to one per frame, and it is a single compositor layer with
 * nothing beneath it repainting. If it ever shows up in a profile, the next
 * step is halving RADIUS, not restructuring.
 */
export default function CursorGridReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Nothing to follow on touch, and nothing at all if the user opted out.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let x = 0
    let y = 0
    let raf = 0

    const write = () => {
      raf = 0
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
    }

    const onMove = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      el.style.opacity = '1'
      if (!raf) raf = requestAnimationFrame(write)
    }

    // Fade out when the pointer leaves the window entirely, so the grid does not
    // sit frozen at the last position while the mouse is elsewhere.
    const onLeave = (e: PointerEvent) => {
      if (!e.relatedTarget) el.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const line = `rgba(255,255,255,${GRID_A})`
  const mask = `radial-gradient(${RADIUS}px circle at var(--mx) var(--my), #000 10%, rgba(0,0,0,0.55) 45%, transparent 75%)`

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 opacity-0 transition-opacity duration-500"
      style={{
        // Two hairline grids plus a blue tint that follows the same point.
        backgroundImage: [
          `repeating-linear-gradient(0deg, transparent, transparent ${GRID - 1}px, ${line} ${GRID - 1}px, ${line} ${GRID}px)`,
          `repeating-linear-gradient(90deg, transparent, transparent ${GRID - 1}px, ${line} ${GRID - 1}px, ${line} ${GRID}px)`,
          `radial-gradient(${RADIUS}px circle at var(--mx) var(--my), rgba(37,99,235,${GLOW_A}) 0%, transparent 70%)`,
        ].join(', '),
        maskImage: mask,
        WebkitMaskImage: mask,
        // Seeded so the first painted frame is never a corner-anchored blob.
        ['--mx' as string]: '50vw',
        ['--my' as string]: '30vh',
      }}
    />
  )
}

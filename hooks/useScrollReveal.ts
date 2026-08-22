'use client'

import { useEffect } from 'react'

/**
 * Observe all `[data-reveal]` elements and add `.visible` when they enter
 * the viewport.  Works in every modern browser — no animation-timeline
 * required.  Respects `prefers-reduced-motion`.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const els = document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger]')
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

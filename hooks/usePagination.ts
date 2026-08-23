'use client'

import { useState } from 'react'

/** Page state for one list.
 *
 *  The current page is *derived* rather than stored, so a list that shrinks
 *  under the viewer - a filter typed, a route removed - slides back into range
 *  on the next render. Storing it meant every caller had to remember its own
 *  setPage(1) whenever its source list changed, and the one that forgot showed
 *  a blank panel with both arrows disabled and no way back. */
export function usePagination<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(1)
  const total = Math.ceil(items.length / perPage)
  const safe = Math.min(page, Math.max(1, total))

  return {
    page: safe,
    total,
    pageItems: items.slice((safe - 1) * perPage, safe * perPage),
    prev: () => setPage(Math.max(1, safe - 1)),
    next: () => setPage(Math.min(total, safe + 1)),
  }
}

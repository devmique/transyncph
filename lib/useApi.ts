'use client'

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `Failed: ${url}`)
  return data
}

/** Cached GET, keyed by url. SWR's cache is module-scoped, so it survives the
 *  unmount a client-side navigation causes - `isLoading` is true only when there
 *  is no cached data yet. Revisiting a page renders instantly and revalidates in
 *  the background instead of flashing a skeleton. */
export function useApi<T>(url: string, fallback: T) {
  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })
  // List endpoints returned a bare array; keep the guard the pages used to do
  // inline so a malformed 200 body can never crash a .map().
  const safe = Array.isArray(fallback) && !Array.isArray(data) ? fallback : data ?? fallback
  return {
    data: safe,
    error: error instanceof Error ? error.message : '',
    isLoading,
    mutate,
  }
}

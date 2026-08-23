import type { APIRequestContext } from '@playwright/test'

/** Shared test operator. Created once by auth.setup.ts; reruns reuse it. */
export const OPERATOR = {
  name: 'E2E Tester',
  companyName: 'E2E Transit Lines',
  email: process.env.E2E_EMAIL || 'e2e-operator@transync.test',
  password: process.env.E2E_PASSWORD || 'e2e-password-123',
  phone: '+639170000000',
  city: 'Lipa City',
  region: 'Region IV-A',
}

/** Suffix so parallel/repeat runs never collide on a name, and so a leftover
 *  row from a crashed run is obvious. */
export const uid = () => Math.random().toString(36).slice(2, 7).toUpperCase()

async function post(api: APIRequestContext, url: string, data: unknown) {
  const res = await api.post(url, { data })
  if (!res.ok()) throw new Error(`POST ${url} → ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function createTerminal(
  api: APIRequestContext,
  name: string,
  lat = 14.5951,
  lng = 121.0273
): Promise<string> {
  const t = await post(api, '/api/terminals', { name, location: 'Metro Manila', lat, lng })
  return t.id
}

export async function createRoute(
  api: APIRequestContext,
  fields: { routeNumber: string; startTerminalId: string; endTerminalId: string }
): Promise<string> {
  const r = await post(api, '/api/routes', {
    startPoint: 'Start',
    endPoint: 'End',
    distance: 42.5,
    estimatedTime: '2 hours',
    ...fields,
  })
  return r.id
}

/** Best-effort teardown. A failed delete must not mask the test's own failure,
 *  so it never throws. */
export async function cleanup(api: APIRequestContext, resource: string, ids: (string | undefined)[]) {
  for (const id of ids) {
    if (id) await api.delete(`/api/${resource}?id=${id}`).catch(() => {})
  }
}

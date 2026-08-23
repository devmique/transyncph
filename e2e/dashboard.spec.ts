import { test, expect } from '@playwright/test'
import { cleanup, createTerminal, uid } from './helpers'

test.describe('dashboard shell', () => {
  test('every sidebar destination loads', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    const nav = page.locator('aside').first()
    for (const [link, heading] of [
      ['Terminals', 'Terminals'],
      ['Routes', 'Routes'],
      ['Schedules', 'Schedules'],
      ['Announcements', 'Announcements'],
      ['Activity', 'Activity'],
      ['Settings', 'Settings'],
      ['Overview', 'Overview'],
    ] as const) {
      await nav.getByRole('link', { name: link }).click()
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
    }
  })

  test('a deep-linked sub-page survives a hard reload', async ({ page }) => {
    // Regression guard: the layout used to redirect on the null operator that
    // /api/auth/me returns while in flight, bouncing every hard load to Overview.
    await page.goto('/dashboard/schedules')
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard\/schedules$/)
    await expect(page.getByRole('heading', { name: 'Schedules', level: 1 })).toBeVisible()
  })

  test('overview counts reflect what the operator actually has', async ({ page, request }) => {
    const card = page.locator('main').getByRole('link', { name: /pickup points on the map/ })
    // -1 while the card is still a skeleton, so expect.poll keeps waiting
    // instead of throwing on a half-rendered read.
    const count = async () => Number((await card.innerText()).match(/\d+/)?.[0] ?? -1)

    await page.goto('/dashboard')
    // The value is a skeleton until the counts land.
    await expect(card.locator('p').nth(1)).toHaveText(/^\d+$/)
    const before = await count()

    const terminal = await createTerminal(request, `E2E Counted ${uid()}`)
    await page.reload()
    await expect.poll(count).toBe(before + 1)

    await cleanup(request, 'terminals', [terminal])
    await page.reload()
    await expect.poll(count).toBe(before)
  })

  test('settings shows the signed-in operator', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('E2E Transit Lines').first()).toBeVisible()
  })
})

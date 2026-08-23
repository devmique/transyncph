import { test, expect } from '@playwright/test'
import { cleanup, createTerminal, uid } from './helpers'

test.describe('routes', () => {
  const terminals: string[] = []
  const routes: string[] = []
  let startName: string
  let endName: string

  test.beforeEach(async ({ request }) => {
    // Terminals are a precondition, not the thing under test - create them
    // through the API so a terminal bug fails terminals.spec, not this one.
    startName = `E2E Start ${uid()}`
    endName = `E2E End ${uid()}`
    terminals.push(await createTerminal(request, startName, 14.5951, 121.0273))
    terminals.push(await createTerminal(request, endName, 13.9411, 121.1622))
  })

  test.afterEach(async ({ request }) => {
    await cleanup(request, 'routes', routes.splice(0))
    await cleanup(request, 'terminals', terminals.splice(0))
  })

  test('create, edit and delete a route through the UI', async ({ page }) => {
    const number = `E2E-${uid()}`

    await page.goto('/dashboard/routes')
    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Route' }).click()
    await page.getByLabel('Route Number').fill(number)
    await page.getByLabel('Distance (km)').fill('88.5')
    await page.getByLabel('Start Terminal').selectOption({ label: `${startName} — Metro Manila` })
    await page.getByLabel('End Terminal').selectOption({ label: `${endName} — Metro Manila` })
    await page.getByLabel('Estimated Time').fill('2 hours 30 minutes')

    const created = page.waitForResponse(
      (r) => r.url().includes('/api/routes') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Save Route' }).click()
    routes.push((await (await created).json()).id)

    const card = page.locator('.group').filter({ hasText: number })
    await expect(card).toBeVisible()
    await expect(card.getByText('88.5 km')).toBeVisible()
    // Terminal selection is what drives start/end point and the map polyline.
    await expect(card.getByText(`${startName}`)).toBeVisible()
    await expect(card.getByText('Map linked')).toBeVisible()

    // ── edit ──
    await page.getByRole('button', { name: `Edit route ${number}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit Route' })).toBeVisible()
    await expect(page.getByLabel('Route Number')).toHaveValue(number)
    await page.getByLabel('Distance (km)').fill('91')
    await page.getByRole('button', { name: 'Update Route' }).click()

    await expect(card.getByText('91 km')).toBeVisible()

    // ── delete ──
    await page.getByRole('button', { name: `Delete route ${number}` }).click()
    await expect(page.getByRole('heading', { name: 'Delete Route' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(card).toHaveCount(0)
    routes.length = 0
  })

  test('a route without terminals selected is not submitted', async ({ page }) => {
    await page.goto('/dashboard/routes')
    await page.getByRole('button', { name: 'Add Route' }).click()
    await page.getByLabel('Route Number').fill(`E2E-${uid()}`)
    await page.getByLabel('Distance (km)').fill('10')
    await page.getByLabel('Estimated Time').fill('30 minutes')
    await page.getByRole('button', { name: 'Save Route' }).click()

    // Form stays open; nothing was created.
    await expect(page.getByRole('heading', { name: 'Create New Route' })).toBeVisible()
  })
})

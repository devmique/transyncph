import { test, expect } from '@playwright/test'
import { cleanup, createRoute, createTerminal, uid } from './helpers'

test.describe('schedules', () => {
  const terminals: string[] = []
  const routes: string[] = []
  const schedules: string[] = []
  let routeNumber: string

  test.beforeEach(async ({ request }) => {
    routeNumber = `E2E-${uid()}`
    const startTerminalId = await createTerminal(request, `E2E Start ${uid()}`)
    const endTerminalId = await createTerminal(request, `E2E End ${uid()}`, 13.9411, 121.1622)
    terminals.push(startTerminalId, endTerminalId)
    routes.push(await createRoute(request, { routeNumber, startTerminalId, endTerminalId }))
  })

  test.afterEach(async ({ request }) => {
    await cleanup(request, 'schedules', schedules.splice(0))
    await cleanup(request, 'routes', routes.splice(0))
    await cleanup(request, 'terminals', terminals.splice(0))
  })

  test('create, edit and delete a schedule through the UI', async ({ page }) => {
    const vehicle = `TSP-${uid()}`

    await page.goto('/dashboard/schedules')
    await expect(page.getByRole('heading', { name: 'Schedules' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Schedule' }).click()
    await page.getByLabel('Route', { exact: true }).selectOption({ label: `${routeNumber} · Start → End` })
    await page.getByLabel('Departure Time').fill('08:30')
    await page.getByLabel('Arrival Time').fill('11:00')
    await page.getByLabel('Driver Name').fill('Juan Dela Cruz')
    await page.getByLabel('Vehicle Number').fill(vehicle)
    await page.getByLabel('Fare (₱)').fill('250')
    await page.getByRole('button', { name: 'Weekdays' }).click()

    const created = page.waitForResponse(
      (r) => r.url().includes('/api/schedules') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Save Schedule' }).click()
    schedules.push((await (await created).json()).id)

    const row = page.locator('.group').filter({ hasText: vehicle })
    await expect(row).toBeVisible()
    // The route join is the part most likely to break - a schedule whose route
    // did not resolve renders as an em dash.
    await expect(row).toContainText(`${routeNumber} · Start → End`)
    // Entered as 24h, stored and displayed as 12h.
    await expect(row).toContainText('08:30 AM')
    await expect(row).toContainText('11:00 AM')
    await expect(row).toContainText('₱250')
    await expect(row).toContainText('Weekdays')
    await expect(row.getByText('active', { exact: true })).toBeVisible()

    // ── edit ──
    await page.getByRole('button', { name: `Edit schedule for ${vehicle}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit Schedule' })).toBeVisible()
    await expect(page.getByLabel('Departure Time')).toHaveValue('08:30')
    await page.getByLabel('Status').selectOption('inactive')
    await page.getByLabel('Fare (₱)').fill('275')
    await page.getByRole('button', { name: 'Update Schedule' }).click()

    await expect(row.getByText('inactive', { exact: true })).toBeVisible()
    await expect(row).toContainText('₱275')

    // ── delete ──
    await page.getByRole('button', { name: `Delete schedule for ${vehicle}` }).click()
    await expect(page.getByRole('heading', { name: 'Delete Schedule' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(row).toHaveCount(0)
    schedules.length = 0
  })

  test('a schedule with no days selected is rejected', async ({ page }) => {
    await page.goto('/dashboard/schedules')
    await page.getByRole('button', { name: 'Add Schedule' }).click()
    await page.getByLabel('Route', { exact: true }).selectOption({ label: `${routeNumber} · Start → End` })
    await page.getByLabel('Departure Time').fill('08:30')
    await page.getByLabel('Arrival Time').fill('11:00')
    await page.getByLabel('Driver Name').fill('Juan Dela Cruz')
    await page.getByLabel('Vehicle Number').fill(`TSP-${uid()}`)
    await page.getByLabel('Fare (₱)').fill('250')

    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await page.getByRole('button', { name: day, exact: true }).click()
    }
    await page.getByRole('button', { name: 'Save Schedule' }).click()

    await expect(page.getByText('Pick at least one day this trip runs.').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create New Schedule' })).toBeVisible()
  })

  test('the driver link is minted per schedule and opens the driver page', async ({
    page,
    context,
  }) => {
    const vehicle = `TSP-${uid()}`
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto('/dashboard/schedules')
    await page.getByRole('button', { name: 'Add Schedule' }).click()
    await page.getByLabel('Route', { exact: true }).selectOption({ label: `${routeNumber} · Start → End` })
    await page.getByLabel('Departure Time').fill('06:00')
    await page.getByLabel('Arrival Time').fill('09:15')
    await page.getByLabel('Driver Name').fill('Maria Santos')
    await page.getByLabel('Vehicle Number').fill(vehicle)
    await page.getByLabel('Fare (₱)').fill('180')

    const created = page.waitForResponse(
      (r) => r.url().includes('/api/schedules') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Save Schedule' }).click()
    schedules.push((await (await created).json()).id)

    await page.getByRole('button', { name: `Copy driver link for ${vehicle}` }).click()
    await expect(page.getByText('Driver link copied', { exact: true })).toBeVisible()

    const link = await page.evaluate(() => navigator.clipboard.readText())
    expect(link).toContain('/driver?token=')

    // Drivers have no account, so the link has to work in a clean session.
    const driverPage = await context.browser()!.newContext()
    const driver = await driverPage.newPage()
    await driver.goto(link)
    await expect(driver.getByText(vehicle)).toBeVisible()
    await expect(driver.getByText(`Route ${routeNumber}`)).toBeVisible()
    await expect(driver.getByRole('button', { name: 'Start Trip' })).toBeEnabled()
    await driverPage.close()
  })
})

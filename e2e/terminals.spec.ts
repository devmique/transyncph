import { test, expect } from '@playwright/test'
import { cleanup, uid } from './helpers'

test.describe('terminals', () => {
  test('create, edit and delete a terminal through the UI', async ({ page, request }) => {
    const name = `E2E Terminal ${uid()}`
    const renamed = `${name} (renamed)`
    let id: string | undefined

    await page.goto('/dashboard/terminals')
    await expect(page.getByRole('heading', { name: 'Terminals' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Terminal' }).click()
    await page.getByLabel('Terminal Name').fill(name)
    await page.getByLabel('Location', { exact: true }).fill('Quezon City, Metro Manila')

    // Coordinates live behind a disclosure; the map picker is the primary path.
    await page.getByText('Enter coordinates manually').click()
    await page.getByLabel('Latitude').fill('14.6091')
    await page.getByLabel('Longitude').fill('121.0223')

    const created = page.waitForResponse(
      (r) => r.url().includes('/api/terminals') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Save Terminal' }).click()
    id = (await (await created).json()).id

    await expect(page.getByText(name, { exact: true })).toBeVisible()
    await expect(page.getByText('14.6091, 121.0223')).toBeVisible()

    // ── edit ──
    await page.getByRole('button', { name: `Edit ${name}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit Terminal' })).toBeVisible()
    await expect(page.getByLabel('Terminal Name')).toHaveValue(name)
    await page.getByLabel('Terminal Name').fill(renamed)
    await page.getByRole('button', { name: 'Update Terminal' }).click()

    await expect(page.getByText(renamed, { exact: true })).toBeVisible()
    await expect(page.getByText(name, { exact: true })).toHaveCount(0)

    // ── delete ──
    await page.getByRole('button', { name: `Delete ${renamed}` }).click()
    await expect(page.getByRole('heading', { name: 'Delete Terminal' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByText(renamed, { exact: true })).toHaveCount(0)
    id = undefined

    await cleanup(request, 'terminals', [id])
  })

  test('a terminal cannot be saved without coordinates', async ({ page }) => {
    await page.goto('/dashboard/terminals')
    await page.getByRole('button', { name: 'Add Terminal' }).click()
    await page.getByLabel('Terminal Name').fill(`No Coords ${uid()}`)
    await page.getByLabel('Location', { exact: true }).fill('Nowhere')
    await page.getByRole('button', { name: 'Save Terminal' }).click()

    await expect(
      page.getByText('Pick a location on the map, or enter valid coordinates.')
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create New Terminal' })).toBeVisible()
  })

  test('an out-of-range latitude is rejected', async ({ page }) => {
    await page.goto('/dashboard/terminals')
    await page.getByRole('button', { name: 'Add Terminal' }).click()
    await page.getByLabel('Terminal Name').fill(`Bad Lat ${uid()}`)
    await page.getByLabel('Location', { exact: true }).fill('Nowhere')
    await page.getByText('Enter coordinates manually').click()
    await page.getByLabel('Latitude').fill('999')
    await page.getByLabel('Longitude').fill('121.0223')
    await page.getByRole('button', { name: 'Save Terminal' }).click()

    await expect(page.getByText('Latitude must be between -90 and 90.')).toBeVisible()
  })
})

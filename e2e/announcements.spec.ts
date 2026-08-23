import { test, expect } from '@playwright/test'
import { cleanup, uid } from './helpers'

test.describe('announcements', () => {
  test('create, edit and delete an announcement through the UI', async ({ page, request }) => {
    const title = `E2E Reroute ${uid()}`
    const renamed = `${title} (updated)`
    let id: string | undefined

    await page.goto('/dashboard/announcements')
    await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible()

    await page.getByRole('button', { name: 'New Announcement' }).click()
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Message').fill('Southbound trips are rerouted via the diversion road.')
    await page.getByLabel('Type').selectOption('warning')
    await page.getByLabel('Affected Routes (comma-separated)').fill('RT-001, RT-002')

    const created = page.waitForResponse(
      (r) => r.url().includes('/api/announcements') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Create Announcement' }).click()
    id = (await (await created).json()).id

    const card = page.locator('.group').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Warning')
    await expect(card).toContainText('Southbound trips are rerouted')
    // Comma-separated input has to land as two separate route chips.
    await expect(card.getByText('RT-001', { exact: true })).toBeVisible()
    await expect(card.getByText('RT-002', { exact: true })).toBeVisible()

    // ── edit ──
    await page.getByRole('button', { name: `Edit ${title}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit Announcement' })).toBeVisible()
    await expect(page.getByLabel('Affected Routes (comma-separated)')).toHaveValue('RT-001, RT-002')
    await page.getByLabel('Title').fill(renamed)
    await page.getByLabel('Type').selectOption('alert')
    await page.getByRole('button', { name: 'Update Announcement' }).click()

    const updated = page.locator('.group').filter({ hasText: renamed })
    await expect(updated).toContainText('Alert')

    // ── delete ──
    await page.getByRole('button', { name: `Delete ${renamed}` }).click()
    await expect(page.getByRole('heading', { name: 'Delete Announcement' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(updated).toHaveCount(0)
    id = undefined

    await cleanup(request, 'announcements', [id])
  })

  test('an announcement with no affected routes is not submitted', async ({ page }) => {
    await page.goto('/dashboard/announcements')
    await page.getByRole('button', { name: 'New Announcement' }).click()
    await page.getByLabel('Title').fill(`No Routes ${uid()}`)
    await page.getByLabel('Message').fill('Nobody is affected.')
    await page.getByRole('button', { name: 'Create Announcement' }).click()

    await expect(page.getByRole('heading', { name: 'Create New Announcement' })).toBeVisible()
  })
})

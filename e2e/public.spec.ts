import { test, expect } from '@playwright/test'

test.describe('public pages', () => {
  test('the landing page leads to register, login and the map', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Your whole network/ })).toBeVisible()

    await page.getByRole('link', { name: 'See the live map' }).click()
    await expect(page).toHaveURL(/\/map$/)

    await page.goto('/')
    await page.getByRole('link', { name: 'Get started' }).first().click()
    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

    await page.getByRole('link', { name: 'Sign in here' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('the commuter map loads its finder and tabs', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByText('Route & Schedule Finder')).toBeVisible()

    const search = page.getByPlaceholder('Route number, origin, or destination...')
    await expect(search).toBeVisible()

    // Terminals come from every operator, so the tab is the safest thing to
    // assert on without seeding public data.
    await page.getByRole('button', { name: /Terminals/ }).click()
    await expect(page.getByPlaceholder('Filter terminals...')).toBeVisible()

    // A query that matches nothing must not blank the page or throw.
    await page.getByRole('button', { name: /Routes/ }).click()
    await search.fill('zzz-no-such-route-zzz')
    await expect(search).toHaveValue('zzz-no-such-route-zzz')
    expect(await page.locator('.leaflet-container').count()).toBeGreaterThan(0)
  })

  test('the driver page refuses to track without a valid link', async ({ page }) => {
    await page.goto('/driver')
    await expect(page.getByText('No driver link')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Trip' })).toBeDisabled()

    await page.goto('/driver?token=not-a-real-token')
    await expect(page.getByText('This driver link is not valid')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Trip' })).toBeDisabled()
  })
})

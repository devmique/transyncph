import { test, expect } from '@playwright/test'
import { cleanup, createTerminal, uid } from './helpers'

// The commuter map is public, but seeding terminals needs an authenticated
// API call - hence this lives in the dashboard project rather than public.spec.
test.describe('map pagination', () => {
  const terminals: string[] = []
  let prefix: string

  test.beforeEach(async ({ request }) => {
    // TERMINALS_PER_PAGE is 4, so five seeded terminals give exactly two pages
    // once the filter narrows the (multi-operator) list down to just these.
    prefix = `ZZPAGE${uid()}`
    for (const suffix of ['A', 'B', 'C', 'D', 'E']) {
      terminals.push(await createTerminal(request, `${prefix}-${suffix}`))
    }
  })

  test.afterEach(async ({ request }) => {
    await cleanup(request, 'terminals', terminals.splice(0))
  })

  const openTerminals = async (page: import('@playwright/test').Page, filter: string) => {
    await page.goto('/map')
    await page.getByRole('button', { name: /Terminals/ }).click()
    await page.getByPlaceholder('Filter terminals...').fill(filter)
  }

  test('filtering to fewer pages while on a later page still shows results', async ({ page }) => {
    await openTerminals(page, prefix)

    const next = page.getByRole('button', { name: 'Next page of terminals' })
    await expect(page.getByText(`${prefix}-A`, { exact: true })).toBeVisible()
    await expect(page.getByText(`${prefix}-E`, { exact: true })).toHaveCount(0)

    await next.click()
    await expect(page.getByText(`${prefix}-E`, { exact: true })).toBeVisible()

    // Now shrink the list to a single page while parked on page 2. The page
    // number is derived, so it slides back into range instead of slicing past
    // the end and rendering an empty panel with both arrows disabled.
    await page.getByPlaceholder('Filter terminals...').fill(`${prefix}-A`)

    await expect(page.getByText(`${prefix}-A`, { exact: true })).toBeVisible()
    // One page left, so the controls hide themselves entirely.
    await expect(next).toHaveCount(0)
  })

  test('paging back and forth stays within bounds', async ({ page }) => {
    await openTerminals(page, prefix)

    const next = page.getByRole('button', { name: 'Next page of terminals' })
    const prev = page.getByRole('button', { name: 'Previous page of terminals' })

    await expect(prev).toBeDisabled()
    await next.click()
    await expect(next).toBeDisabled()
    await prev.click()
    await expect(prev).toBeDisabled()
    await expect(page.getByText(`${prefix}-A`, { exact: true })).toBeVisible()
  })

  test('the counter names what is being paged', async ({ page }) => {
    await openTerminals(page, prefix)
    // Every list reads the same way now, rather than terminals omitting the noun.
    await expect(page.locator('aside').getByText('5 terminals')).toBeVisible()
  })
})

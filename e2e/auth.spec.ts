import { test, expect } from '@playwright/test'
import { OPERATOR } from './helpers'

test.describe('authentication', () => {
  test('an unauthenticated visitor is bounced from the dashboard to login', async ({ page }) => {
    await page.goto('/dashboard/routes')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('wrong password is rejected without leaking whether the email exists', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email Address').fill(OPERATOR.email)
    await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('register rejects mismatched passwords before hitting the API', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Company Name').fill('Mismatch Lines')
    await page.getByLabel('Email Address').fill(`nobody-${Date.now()}@transync.test`)
    await page.getByLabel('Password', { exact: true }).fill('password-one')
    await page.getByLabel('Confirm Password', { exact: true }).fill('password-two')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('Passwords do not match')).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('sign in, land on the dashboard, then log out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email Address').fill(OPERATOR.email)
    await page.getByLabel('Password', { exact: true }).fill(OPERATOR.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('**/dashboard')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // A signed-in operator has no business on the public-only pages.
    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('button', { name: 'Log out' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByText('E2E Transit Lines')).toBeVisible()
    await confirm.getByRole('button', { name: 'Log out' }).click()

    await page.waitForURL('**/login')
    // The cookie is really gone, not just the client-side state.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })
})

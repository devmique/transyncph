import { test as setup, expect } from '@playwright/test'
import { OPERATOR } from './helpers'

const authFile = 'e2e/.auth/operator.json'

setup('sign in as the test operator', async ({ page, request }) => {
  // Idempotent: the first ever run creates the account, later runs get
  // "Email already registered", which is the state we wanted anyway.
  const res = await request.post('/api/auth/register', { data: OPERATOR })
  expect(
    res.ok() || (await res.json()).error === 'Email already registered',
    'test operator could not be created'
  ).toBeTruthy()

  await page.goto('/login')
  await page.getByLabel('Email Address').fill(OPERATOR.email)
  await page.getByLabel('Password', { exact: true }).fill(OPERATOR.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL('**/dashboard')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await page.context().storageState({ path: authFile })
})

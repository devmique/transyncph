import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// Tests hit the real API, which needs JWT_SECRET/MONGODB_URI from .env.local.
loadEnvConfig(process.cwd())

const PORT = process.env.E2E_PORT || '4000'
const baseURL = `http://localhost:${PORT}`

const rand = () => Math.floor(Math.random() * 254) + 1

export default defineConfig({
  testDir: './e2e',
  // Login is rate limited to 5/15min per IP and every spec shares one Mongo
  // database, so serial is the honest setting here.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Login/register are rate limited per client IP (5/15min, 6/hr). Without
    // this every run after the first would fail on 429 instead of on a real
    // bug, so each run claims a fresh bucket.
    extraHTTPHeaders: {
      'x-forwarded-for': `10.${rand()}.${rand()}.${rand()}`,
    },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'public',
      testMatch: /public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'dashboard',
      testIgnore: /(auth\.spec|public\.spec|auth\.setup)\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/operator.json' },
    },
  ],
  webServer: {
    command: 'npx tsx server.ts',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})

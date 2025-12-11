import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_TEST_MODE: 'true',
      NEXTAUTH_SECRET: 'Orm9qXIQGs6hlKKlWFh5X0dZXHUqReds',
      NEXTAUTH_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/noteol?schema=public',
      EMAIL_SERVER_HOST: 'smtp.qq.com',
      EMAIL_SERVER_PORT: '465',
      EMAIL_SERVER_USER: 'coiness@qq.com',
      EMAIL_SERVER_PASSWORD: 'ukutiidkrhdvigbb',
      EMAIL_FROM: 'coiness@qq.com',
    },
  },
});

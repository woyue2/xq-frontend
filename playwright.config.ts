import { defineConfig, devices } from '@playwright/test';

const frontendBaseURL =
  process.env.FRONTEND_BASE_URL || 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    // 前端本地开发默认地址，可通过 FRONTEND_BASE_URL 覆盖
    baseURL: frontendBaseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: frontendBaseURL,
    reuseExistingServer: process.env.CI ? false : true,
    timeout: 120_000,
    // E2E 联调时强制关闭前端 Mock，确保所有请求走真实后端
    env: {
      ...process.env,
      VITE_USE_MOCK: 'false'
    }
  }
});

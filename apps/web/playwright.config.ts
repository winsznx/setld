import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../../evidence/fresh-user/playwright-report' }]],
  use: {
    baseURL: process.env.SETLD_URL || 'http://localhost:3000',
    trace: 'on',
    video: 'on',
  },
  webServer: process.env.SETLD_URL
    ? undefined
    : { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 60_000 },
});

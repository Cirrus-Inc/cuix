import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets a second worktree run its own server: reuseExistingServer would
// otherwise test whichever tree already holds the default port.
const port = Number(process.env.E2E_PORT) || 5179;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', testMatch: 'overlays.spec.ts', use: devices['Desktop Safari'] },
  ],
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});

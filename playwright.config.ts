import { defineConfig, devices } from '@playwright/test';

/* End-to-end checks against the built site (npm run build first).
   Locally they use your installed Chrome; in CI, Playwright's own Chromium. */
const local = !process.env.CI;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !local,
  retries: local ? 0 : 1,
  reporter: local ? 'list' : [['list'], ['github']],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    ...(local ? { channel: 'chrome' } : {})
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(local ? { channel: 'chrome' } : {}) } },
    { name: 'phone', use: { ...devices['Pixel 7'], ...(local ? { channel: 'chrome' } : {}) } }
  ],
  webServer: {
    command: 'npx astro preview --port 4321 --host 127.0.0.1',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: local
  }
});

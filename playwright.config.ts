import { defineConfig, devices } from '@playwright/test';

/* End-to-end checks against the built site (npm run build first), served by
   Cloudflare's local runtime so headers and redirects match production.
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
    command: 'npx wrangler dev --port 4321 --ip 127.0.0.1 --log-level warn',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: local
  }
});

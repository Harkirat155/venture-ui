import { defineConfig, devices } from '@playwright/test';

// The gallery is served from its production build (`pnpm build` first). Screenshot baselines are Linux
// Chromium only: `pnpm e2e` runs this config inside the official Playwright image when you are not on
// Linux, and CI runs it in that same image (see scripts/e2e.sh).
const PORT = Number(process.env.E2E_PORT ?? 4317);
const origin = `http://127.0.0.1:${PORT}`;

const viewports = { '390': { width: 390, height: 844 }, '1280': { width: 1280, height: 800 } };
const schemes = ['light', 'dark'] as const;

export default defineConfig({
  testDir: 'tests',
  snapshotDir: 'snapshots',
  // One flat folder; the project name (scheme and width) and platform (-linux) are in each file name.
  snapshotPathTemplate: '{snapshotDir}/{arg}{-projectName}{-snapshotSuffix}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Every run must be deterministic: a retry would hide a flake behind a pass.
  retries: 0,
  // Per-test default; each spec also sets its own explicit timeout (tests/budget.ts).
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: origin,
    // Same clock and language everywhere, so "local day" and number formats cannot differ by machine.
    locale: 'en-US',
    timezoneId: 'UTC',
    // Honour prefers-reduced-motion in every run; the screenshots also disable animations.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: schemes.flatMap((colorScheme) =>
    Object.entries(viewports).map(([width, viewport]) => ({
      name: `${colorScheme}-${width}`,
      use: { colorScheme, viewport },
    })),
  ),
  webServer: {
    command: `pnpm --filter @venture-ui/example-gallery exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: origin,
    // Never adopt a server that is already there: it could be another checkout's build.
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

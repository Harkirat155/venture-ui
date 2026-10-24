import { expect, test } from '@playwright/test';
import { TEST_TIMEOUT_MS } from './budget';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

// The emulation every other test relies on: if a project silently ran light, or with motion, its
// screenshots and axe results would not mean what their names say.
test('the project runs with its colour scheme, reduced motion, UTC and en-US', async ({ page }, testInfo) => {
  await page.goto('/');
  const scheme = testInfo.project.name.startsWith('dark') ? 'dark' : 'light';
  const env = await page.evaluate(() => ({
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    width: innerWidth,
  }));
  expect(env.dark).toBe(scheme === 'dark');
  expect(env.reduced).toBe(true);
  expect(env.zone).toBe('UTC');
  expect(env.locale).toBe('en-US');
  expect(String(env.width)).toBe(testInfo.project.name.split('-')[1]);
});

// The scheme must reach the pixels: if Theme ignored it, light and dark projects would render the same page and
// the dark axe run would prove nothing.
test('the page background is light in light projects and dark in dark projects', async ({ page }, testInfo) => {
  await page.goto('/#/Timeline/Default');
  const [r = 0, g = 0, b = 0] = await page.locator('main[data-story-page]').evaluate((main) => {
    const page = main.parentElement ?? main;
    return getComputedStyle(page).backgroundColor.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
  });
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (testInfo.project.name.startsWith('dark')) expect(luminance).toBeLessThan(0.2);
  else expect(luminance).toBeGreaterThan(0.8);
});

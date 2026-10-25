import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from './axe';
import { TEST_TIMEOUT_MS } from './budget';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

async function openStory(page: Page, name: string) {
  await page.goto(`/#/DiffView/${name}`);
  await expect(page.locator(`main[data-story-page="DiffView/${name}"]`)).toBeVisible();
}

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('auto is unified on a phone and side by side on a desktop', async ({ page }) => {
  await openStory(page, 'Auto');
  const headers = page.getByRole('columnheader');
  await expect(headers).toHaveCount(4);
  const isPhone = (page.viewportSize()?.width ?? 0) < 768;
  await expect(headers).toHaveText(isPhone ? ['Old', 'New', 'Change', 'Line'] : ['Old', 'Before', 'New', 'After']);
});

test('the summary counts changed lines and is spoken as words', async ({ page }) => {
  await openStory(page, 'Unified');
  await expect(page.getByText('+5 −5 lines', { exact: true })).toBeVisible();
  await expect(page.getByText('5 lines added, 5 lines removed')).toBeAttached();
});

test('a changed line is never colour alone: a + or − marker and a spoken word', async ({ page }) => {
  await openStory(page, 'Unified');
  const removed = page.locator('tbody tr', { hasText: 'replicas: 2' });
  await expect(removed.locator('td').nth(2)).toContainText('−');
  await expect(removed.locator('td').nth(2)).toContainText('removed');
  const added = page.locator('tbody tr', { hasText: 'replicas: 3' });
  await expect(added.locator('td').nth(2)).toContainText('+');
  await expect(added.locator('td').nth(2)).toContainText('added');
});

test('a collapsed run opens and closes in place, by mouse and keyboard, and keeps focus', async ({ page }) => {
  await openStory(page, 'Unified');
  const show = page.getByRole('button', { name: /^Show \d+ unchanged lines?$/ }).first();
  const hiddenLine = page.getByText('RETRIES: 3', { exact: true });
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(hiddenLine).toBeHidden();
  const rowsBefore = await page.locator('tbody tr').count();

  await show.click();
  const hide = page.getByRole('button', { name: /^Hide \d+ unchanged lines?$/ }).first();
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  expect(await page.locator('tbody tr').count()).toBeGreaterThan(rowsBefore);
  await expect(hiddenLine).toBeVisible();

  await hide.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^Show \d+ unchanged lines?$/ }).first()).toBeFocused();
  expect(await page.locator('tbody tr').count()).toBe(rowsBefore);
  await expect(hiddenLine).toBeHidden();
});

test('with every run open there are no axe violations and no sideways scroll', async ({ page }) => {
  await openStory(page, 'Unified');
  const show = page.getByRole('button', { name: /^Show / });
  // Each press turns that button into a "Hide", so the next "Show" is always the first one.
  while ((await show.count()) > 0) await show.first().click();
  expect(await axeViolations(page)).toEqual([]);
  expect(await noSidewaysScroll(page)).toBe(true);
  await expect(page).toHaveScreenshot('DiffView-Unified-expanded.png', { fullPage: true });
});

test('the side-by-side view, fully opened, has no axe violations and no sideways scroll', async ({ page }) => {
  await openStory(page, 'Split');
  const show = page.getByRole('button', { name: /^Show / });
  while ((await show.count()) > 0) await show.first().click();
  expect(await axeViolations(page)).toEqual([]);
  expect(await noSidewaysScroll(page)).toBe(true);
  await expect(page).toHaveScreenshot('DiffView-Split-expanded.png', { fullPage: true });
});

test('split pairs the removed and the added line on one row', async ({ page }) => {
  await openStory(page, 'Split');
  const row = page.locator('tbody tr', { hasText: 'replicas: 2' });
  await expect(row).toContainText('replicas: 3');
  await expect(page.getByRole('columnheader')).toHaveText(['Old', 'Before', 'New', 'After']);
});

test('in the side-by-side view every line row exposes the same four cells, and the text of an unchanged line is read once', async ({ page }) => {
  await openStory(page, 'Split');
  const lines = page.locator('tbody tr').filter({ hasNot: page.getByRole('button') });
  expect(await lines.count()).toBeGreaterThan(6);
  for (const row of await lines.all()) await expect(row.getByRole('cell')).toHaveCount(4);
  // "name: web" is the first line and unchanged: both sides show it, the accessibility tree has it once.
  await expect(page.getByRole('cell', { name: /^unchanged\s*name: web$/ })).toHaveCount(1);
  await expect(page.getByRole('cell').filter({ hasText: 'name: web' })).toHaveCount(2);
});

test('identical texts show "No changes" and no table', async ({ page }) => {
  await openStory(page, 'Identical');
  await expect(page.getByRole('status')).toHaveText('No changes');
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('markdown headings and fences are emphasised', async ({ page }) => {
  await openStory(page, 'Markdown');
  await expect(page.locator('[data-emphasis="heading"]').first()).toBeVisible();
  // The code fence is far from any change, so it starts collapsed.
  const show = page.getByRole('button', { name: /^Show / });
  while ((await show.count()) > 0) await show.first().click();
  await expect(page.locator('[data-emphasis="fence"]').first()).toBeVisible();
});

test('line endings kept apart show a visible ␍', async ({ page }) => {
  await openStory(page, 'LineEndings');
  await expect(page.getByText('a␍')).toBeVisible();
});

test('a line of one unbroken token wraps instead of widening the page', async ({ page }) => {
  await openStory(page, 'LongLines');
  expect(await noSidewaysScroll(page)).toBe(true);
});

test('a 2,000-line input renders its three changes, with the rest collapsed', async ({ page }) => {
  const start = Date.now();
  await openStory(page, 'Large');
  await expect(page.getByText('+3 −3 lines', { exact: true })).toBeVisible();
  expect(Date.now() - start).toBeLessThan(5_000);
  expect(await page.locator('tbody tr').count()).toBeLessThan(40);
  await expect(page.getByRole('button', { name: /^Show \d+ unchanged lines$/ }).first()).toBeVisible();
});

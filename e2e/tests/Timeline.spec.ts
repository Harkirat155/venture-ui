import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from './axe';
import { TEST_TIMEOUT_MS } from './budget';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

async function openStory(page: Page, name: string) {
  await page.goto(`/#/Timeline/${name}`);
  await expect(page.locator(`main[data-story-page="Timeline/${name}"]`)).toBeVisible();
}

test('a body is hidden until its Details button is pressed, by mouse or keyboard', async ({ page }) => {
  await openStory(page, 'Default');
  const button = page.getByRole('button', { name: /^Details for Deploy finished/ });
  const body = page.getByText('Build 4821 reached production');

  await expect(button).toHaveJSProperty('tagName', 'BUTTON');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(body).toBeHidden();

  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(body).toBeVisible();
  // aria-controls points at the region that holds the body.
  const controlled = await button.getAttribute('aria-controls');
  await expect(page.locator(`[id="${controlled}"]`)).toContainText('Build 4821 reached production');

  await button.click();
  await expect(body).toBeHidden();

  await button.focus();
  await page.keyboard.press('Enter');
  await expect(body).toBeVisible();
  await page.keyboard.press('Space');
  await expect(body).toBeHidden();
});

test('Tab walks the Details buttons in order, and a collapsed body adds no tab stop', async ({ page }) => {
  await openStory(page, 'Default');
  // The story page has one link ("All stories") before the feed.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'All stories' })).toBeFocused();
  for (const title of ['Deploy finished', 'Build 4820 passed', 'Rollback failed']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: new RegExp(`^Details for ${title}`) })).toBeFocused();
  }
  // One more Tab leaves the page content: no further stop inside the feed, collapsed bodies included.
  await page.keyboard.press('Tab');
  await expect(page.locator('main :focus')).toHaveCount(0);
});

test('with every body open there are still no axe violations, and the page fits', async ({ page }) => {
  await openStory(page, 'Default');
  for (const button of await page.getByRole('button', { name: /^Details for / }).all()) await button.click();
  await expect(page.getByRole('button', { expanded: true })).toHaveCount(3);
  expect(await axeViolations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page).toHaveScreenshot('Timeline-Default-expanded.png', { fullPage: true });
});

test('grouped by day: a heading per day, each labelling the ordered list under it', async ({ page }) => {
  await openStory(page, 'GroupedByDay');
  const headings = page.getByRole('heading', { level: 2 });
  await expect(headings).toHaveText(['Monday, March 2, 2026', 'Sunday, March 1, 2026']);
  const monday = page.getByRole('list', { name: 'Monday, March 2, 2026' });
  const sunday = page.getByRole('list', { name: 'Sunday, March 1, 2026' });
  await expect(monday).toHaveJSProperty('tagName', 'OL');
  await expect(sunday).toHaveJSProperty('tagName', 'OL');
  await expect(monday.getByRole('listitem')).toHaveCount(3);
  await expect(sunday.getByRole('listitem')).toHaveCount(2);
});

test('each time is a <time> element carrying its ISO value', async ({ page }) => {
  await openStory(page, 'Default');
  const times = page.locator('main time[datetime]');
  await expect(times).toHaveCount(5);
  await expect(times.first()).toBeVisible();
  await expect(times.first()).toHaveAttribute('datetime', '2026-03-02T09:42:00.000Z');
});

test('every status is shown as words next to its dot', async ({ page }) => {
  await openStory(page, 'Default');
  for (const word of ['Success', 'Warning', 'Error', 'Info']) await expect(page.getByText(word, { exact: true })).toBeVisible();
});

test('long titles, links and unbroken URLs wrap instead of overflowing, even when open', async ({ page }) => {
  await openStory(page, 'LongContent');
  await page.getByRole('button', { name: /^Details for Permission change/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await axeViolations(page)).toEqual([]);
});

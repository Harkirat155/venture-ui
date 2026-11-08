import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from './axe';
import { TEST_TIMEOUT_MS } from './budget';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

async function openStory(page: Page, name: string) {
  await page.goto(`/#/SentenceFilter/${name}`);
  await expect(page.locator(`main[data-story-page="SentenceFilter/${name}"]`)).toBeVisible();
}

const genre = (page: Page) => page.getByRole('button', { name: /^Genre: / });
const language = (page: Page) => page.getByRole('button', { name: /^Language: / });

test('choosing an option by click changes the word, closes the popup and returns focus to the word', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('radio', { name: /poetry/ }).click();
  await expect(genre(page)).toHaveAccessibleName('Genre: poetry');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toBeFocused();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Newest poetry in any language');
});

test('Escape closes the popup, returns focus to the word and changes nothing', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await language(page).click();
  await expect(page.getByRole('radio', { name: /French/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(language(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(language(page)).toBeFocused();
  await expect(language(page)).toHaveAccessibleName('Language: any language');
});

test('arrow keys browse without choosing and skip a disabled option; Enter chooses', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).focus();
  await page.keyboard.press('Enter');
  const options = ['any genre', 'poetry', 'essays', 'travel'];
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeFocused();
  for (const name of options.slice(1)) {
    await page.keyboard.press('ArrowDown');
    // "drama" sits between essays and travel and is disabled, so it never takes focus.
    await expect(page.getByRole('radio', { name: new RegExp(name) })).toBeFocused();
  }
  await expect(genre(page)).toHaveAccessibleName('Genre: any genre');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('radio', { name: /drama/ })).toBeDisabled();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('radio', { name: /essays/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(genre(page)).toHaveAccessibleName('Genre: essays');
  await expect(genre(page)).toBeFocused();
});

test('the selected option has a checked radio, and counts show beside the labels', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /poetry/ })).not.toBeChecked();
  await expect(page.getByText('12,345')).toBeVisible();
  await expect(page.getByText('87', { exact: true })).toBeVisible();
});

test('a word never breaks mid-trigger, and the sentence never scrolls sideways', async ({ page }) => {
  await openStory(page, 'LongSentence');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // "any language" is short: it must sit on one line whatever the width.
  const lines = await language(page).evaluate((el) => el.getClientRects().length);
  expect(lines).toBe(1);
});

test('every control is at least 44 px tall, and the lines of the sentence keep the text line height', async ({ page }) => {
  await openStory(page, 'SmallLine');
  for (const control of await page.locator('[data-sentence-filter-control]').all()) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.9);
  }
  const { height, lineHeight } = await page.locator('p:has([data-sentence-filter-control])').first().evaluate((p) => ({
    height: (p.parentElement ?? p).getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(p).lineHeight),
  }));
  // The paragraph is a whole number of text lines tall: the 44 px hit areas did not push lines apart.
  const lineCount = Math.round(height / lineHeight);
  expect(Math.abs(height - lineCount * lineHeight), `height ${height}, line ${lineHeight}`).toBeLessThan(1.5);
});

test('words take their font size from the heading, or from the parent line', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  const large = await page.getByRole('heading', { level: 2 }).evaluate((h) => [getComputedStyle(h).fontSize, getComputedStyle(h.querySelector('button')!).fontSize]);
  expect(large[1]).toBe(large[0]);
  await openStory(page, 'SmallLine');
  const small = await page.locator('p:has([data-sentence-filter-control])').first().evaluate((p) => [getComputedStyle(p.parentElement!).fontSize, getComputedStyle(p.querySelector('button')!).fontSize, getComputedStyle(p).fontSize]);
  expect(small[1]).toBe(small[0]);
  expect(small[2]).toBe(small[0]);
  const heading = await page.getByRole('heading', { level: 1 }).evaluate((h) => getComputedStyle(h).fontSize).catch(() => '');
  expect(parseFloat(large[0] ?? '0')).toBeGreaterThan(parseFloat(small[0] ?? '0') - 0.01);
  void heading;
});

test('removing a token moves focus to the word before it', async ({ page }) => {
  await openStory(page, 'WithToken');
  await expect(page.getByText('by Ada Lovelace')).toBeVisible();
  await page.getByRole('button', { name: 'Remove author filter: Ada Lovelace' }).click();
  await expect(page.getByText('by Ada Lovelace')).toHaveCount(0);
  await expect(language(page)).toBeFocused();
});

test('with a popup open there are no axe violations, and the popup stays inside the viewport', async ({ page }) => {
  await openStory(page, 'LongSentence');
  await genre(page).click();
  const popup = page.getByRole('dialog', { name: 'Genre' });
  await expect(popup).toBeVisible();
  // The longest option label wraps instead of widening the popup past the screen.
  await expect(page.getByRole('radio', { name: /travel writing/ })).toBeVisible();
  const viewport = page.viewportSize()!;
  const box = (await popup.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  // Every count shows whole: its text is not truncated by its own box or by the popup.
  const counts = popup.locator('[data-sentence-filter-count]');
  expect(await counts.count()).toBeGreaterThan(0);
  await expect(counts.first()).toHaveText('12,345 books');
  for (const count of await counts.all()) {
    const c = (await count.boundingBox())!;
    expect(c.x + c.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(await count.evaluate((el) => {
      const popupRect = el.closest('[popover]')!.getBoundingClientRect();
      return el.getBoundingClientRect().right <= popupRect.right + 1;
    })).toBe(true);
  }
  expect(await axeViolations(page)).toEqual([]);
  await expect(page).toHaveScreenshot('SentenceFilter-LongSentence-open.png', { fullPage: true });
});

test('the popup of a small line also stays inside the viewport', async ({ page }) => {
  await openStory(page, 'LongSentenceSmall');
  await language(page).click();
  const box = (await page.getByRole('dialog', { name: 'Language' }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
});

test('Space chooses the option that arrow keys moved to', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).focus();
  await page.keyboard.press('Enter');
  // Focus moves into the popup a moment after it opens; arrow keys pressed sooner would go to the word.
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /poetry/ })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(genre(page)).toHaveAccessibleName('Genre: poetry');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toBeFocused();
});

test('clicking the checked option closes the popup and returns focus, changing nothing', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  await page.getByRole('radio', { name: /any genre/ }).click();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toBeFocused();
  await expect(genre(page)).toHaveAccessibleName('Genre: any genre');
});

test('clicking an option that arrow keys already moved to chooses it and closes', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  await page.getByRole('radio', { name: /any genre/ }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /poetry/ })).toBeChecked();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('radio', { name: /poetry/ }).click();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toHaveAccessibleName('Genre: poetry');
  await expect(genre(page)).toBeFocused();
});

test('Enter on the unchanged option closes without changing anything, and a disabled option never closes', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  await page.getByRole('radio', { name: /drama/ }).click({ force: true });
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('radio', { name: /any genre/ }).focus();
  await page.keyboard.press('Enter');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toBeFocused();
  await expect(genre(page)).toHaveAccessibleName('Genre: any genre');
});

test('Tab and Shift+Tab keep focus inside the open popup', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  const popup = page.getByRole('dialog', { name: 'Genre' });
  for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => document.activeElement?.closest('[popover]') != null)).toBe(true);
    await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(popup).toBeVisible();
});

test('after choosing the option already chosen, reopening and choosing another still works', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).click();
  await page.getByRole('radio', { name: /any genre/ }).click();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await genre(page).click();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('radio', { name: /poetry/ }).click();
  await expect(genre(page)).toHaveAccessibleName('Genre: poetry');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toBeFocused();
});

test('arrows left behind by Escape do not stay: reopening shows the current value checked', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /poetry/ })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await genre(page).click();
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeChecked();
});

test('a held Enter chooses nothing and does not loop the popup open and shut', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).focus();
  await page.keyboard.down('Enter');
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeFocused();
  // From here on the popup must not change state: count every flip of the word's aria-expanded.
  await genre(page).evaluate((el) => {
    const w = window as unknown as { flips: number };
    w.flips = 0;
    new MutationObserver(() => (w.flips += 1)).observe(el, { attributes: true, attributeFilter: ['aria-expanded'] });
  });
  await page.keyboard.down('Enter'); // the second down is an auto-repeat
  await page.keyboard.down('Enter');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { flips: number }).flips)).toBe(0);
  await expect(genre(page)).toHaveAccessibleName('Genre: any genre');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.up('Enter');
  await expect(genre(page)).toHaveAccessibleName('Genre: any genre');
});

test('a held Space chooses once, on release, and does not reopen the popup', async ({ page }) => {
  await openStory(page, 'LargeHeading');
  await genre(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: /any genre/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /poetry/ })).toBeFocused();
  await page.keyboard.down(' ');
  await page.keyboard.down(' '); // auto-repeat
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.up(' ');
  await expect(genre(page)).toHaveAccessibleName('Genre: poetry');
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await page.waitForTimeout(300);
  await expect(genre(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(genre(page)).toBeFocused();
});

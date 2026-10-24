import { expect, test } from '@playwright/test';
import { axeViolations } from './axe';
import { PER_STORY_MS, TEST_TIMEOUT_MS } from './budget';

// Discovers every story from the gallery index, so a new `stories/<Component>.stories.tsx` gets a screenshot
// and an axe check with no change here. Each story is its own step, and a failure in one does not stop the rest.
test('every story: no overflow, no axe violations, screenshot matches', async ({ page }) => {
  await page.goto('/#/');
  const stories = await page.locator('a[data-story]').evaluateAll((links) => links.map((a) => a.getAttribute('data-story') ?? ''));
  expect(stories.length, 'the gallery lists no stories').toBeGreaterThan(0);
  test.setTimeout(TEST_TIMEOUT_MS + stories.length * PER_STORY_MS);

  for (const story of stories) {
    await test.step(story, async () => {
      await page.goto(`/#/${story}`);
      await expect(page.locator(`main[data-story-page="${story}"]`)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect.soft(fits, `${story}: the page scrolls sideways`).toBe(true);
      expect.soft(await axeViolations(page), `${story}: axe`).toEqual([]);
      await expect.soft(page).toHaveScreenshot(`${story.replace('/', '-')}.png`, { fullPage: true });
    });
  }
});

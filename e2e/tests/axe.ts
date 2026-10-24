import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Runs axe over the page and returns one readable line per violation; an empty array means none. */
export async function axeViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
}

import { defineTheme } from '@astryxdesign/core/theme';
import type { DefinedTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import type { DtcgTokens } from '@venture-ui/tokens';
import { assertAccentSeed, dtcgToAstryx } from './dtcgToAstryx.js';

export interface ProductThemeInput {
  /** Theme name, used for the `data-astryx-theme` attribute and the built file names. */
  name: string;
  /** The product's design tokens in DTCG form. */
  tokens: DtcgTokens;
  /** Accent seed (`#RRGGBB`). Wins over a `color.accent` token when both are given. */
  accent?: string;
  /** Base theme to extend. Defaults to Astryx's `neutralTheme`. */
  extends?: DefinedTheme;
}

/**
 * Builds a product's Astryx theme from DTCG tokens: `defineTheme` over
 * `neutralTheme` (or `extends`), with `dtcgToAstryx(tokens)` applied on top.
 *
 * An accent seed regenerates the palettes (including the neutral surfaces) and
 * replaces any `color` scale config on the base theme, as Astryx documents.
 */
export function createProductTheme(input: ProductThemeInput): DefinedTheme {
  const mapped = dtcgToAstryx(input.tokens);
  const accent = input.accent === undefined ? undefined : assertAccentSeed('accent', input.accent);
  return defineTheme({
    name: input.name,
    extends: input.extends ?? neutralTheme,
    ...mapped,
    ...(accent === undefined ? {} : { color: { ...mapped.color, accent } }),
  });
}

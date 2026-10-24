import baseTokens from '@venture-ui/tokens/base.tokens.json' with { type: 'json' };
import type { DtcgTokens } from '@venture-ui/tokens';
import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { describe, expect, it } from 'vitest';
import { createProductTheme } from './createProductTheme.js';
import { InvalidTokenValue, UnsupportedTokenType } from './dtcgToAstryx.js';

const accentOnly: DtcgTokens = {
  color: { accent: { $type: 'color', $value: '#3355ff' } },
};

describe('createProductTheme', () => {
  it('names the theme', () => {
    expect(createProductTheme({ name: 'demo', tokens: accentOnly }).name).toBe('demo');
  });

  it('extends neutralTheme by default (keeps its component overrides)', () => {
    const theme = createProductTheme({ name: 'demo', tokens: accentOnly });
    for (const key of Object.keys(neutralTheme.components ?? {})) {
      expect(theme.components).toHaveProperty(key);
    }
  });

  it('seeds the Astryx palette from the DTCG accent', () => {
    const theme = createProductTheme({ name: 'demo', tokens: accentOnly });
    expect(theme.tokens['--color-accent']).toMatch(/^light-dark\(/);
    expect(theme.tokens['--color-accent']).not.toBe(neutralTheme.tokens['--color-accent']);
    // The seed also derives --color-on-accent; overriding --color-accent alone would not.
    expect(theme.tokens['--color-on-accent']).not.toBe(neutralTheme.tokens['--color-on-accent']);
  });

  it('applies DTCG spacing tokens as scale entries', () => {
    const theme = createProductTheme({
      name: 'demo',
      tokens: { spacing: { '4': { $type: 'dimension', $value: '1.25rem' } } },
    });
    expect(theme.tokens['--spacing-4']).toBe('1.25rem');
  });

  it('lets the explicit accent input win over the DTCG accent', () => {
    const explicit = createProductTheme({ name: 'a', tokens: accentOnly, accent: '#aa2200' });
    const viaTokens = createProductTheme({
      name: 'a',
      tokens: { color: { accent: { $type: 'color', $value: '#aa2200' } } },
    });
    expect(explicit.tokens['--color-accent']).toBe(viaTokens.tokens['--color-accent']);
  });

  it('rejects an accent input that is not a #RRGGBB seed', () => {
    expect(() => createProductTheme({ name: 'demo', tokens: {}, accent: 'rebeccapurple' })).toThrow(
      InvalidTokenValue,
    );
  });

  it('builds from the platform base tokens', () => {
    const theme = createProductTheme({ name: 'demo', tokens: baseTokens });
    expect(theme.tokens['--spacing-4']).toBe('1rem');
    expect(theme.tokens['--radius-element']).toBe('8px');
  });

  it('extends a given base theme instead of neutralTheme', () => {
    const base = defineTheme({ name: 'base', tokens: { '--spacing-1': '9rem' } });
    const theme = createProductTheme({ name: 'demo', tokens: {}, extends: base });
    expect(theme.tokens['--spacing-1']).toBe('9rem');
  });

  it('propagates mapping errors', () => {
    const tokens: DtcgTokens = { x: { y: { $type: 'shadow', $value: 'none' } } };
    expect(() => createProductTheme({ name: 'demo', tokens })).toThrow(UnsupportedTokenType);
  });
});

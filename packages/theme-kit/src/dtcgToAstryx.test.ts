import baseTokens from '@venture-ui/tokens/base.tokens.json' with { type: 'json' };
import type { DtcgTokens } from '@venture-ui/tokens';
import { describe, expect, it } from 'vitest';
import {
  InvalidTokenValue,
  UnmappedToken,
  UnsupportedTokenType,
  dtcgToAstryx,
} from './dtcgToAstryx.js';

describe('dtcgToAstryx', () => {
  it('maps a color token at color.accent to the Astryx accent seed', () => {
    const tokens: DtcgTokens = {
      color: { accent: { $type: 'color', $value: '#3355ff' } },
    };
    expect(dtcgToAstryx(tokens)).toEqual({ color: { accent: '#3355ff' } });
  });

  it('maps a spacing token to a spacing scale entry', () => {
    const tokens: DtcgTokens = {
      spacing: { '4': { $type: 'dimension', $value: '1.25rem' } },
    };
    expect(dtcgToAstryx(tokens)).toEqual({ tokens: { '--spacing-4': '1.25rem' } });
  });

  it('keeps hyphenated step names as written (spacing.0-5 is --spacing-0-5)', () => {
    const tokens: DtcgTokens = {
      spacing: { '0-5': { $type: 'dimension', $value: '0.125rem' } },
    };
    expect(dtcgToAstryx(tokens)).toEqual({ tokens: { '--spacing-0-5': '0.125rem' } });
  });

  it('lets a token inherit $type from its group', () => {
    const tokens: DtcgTokens = {
      spacing: { $type: 'dimension', '2': { $value: '0.5rem' } },
    };
    expect(dtcgToAstryx(tokens)).toEqual({ tokens: { '--spacing-2': '0.5rem' } });
  });

  it('maps non-accent color tokens to Astryx color variables', () => {
    const tokens: DtcgTokens = {
      color: { background: { surface: { $type: 'color', $value: '#fafafa' } } },
    };
    expect(dtcgToAstryx(tokens)).toEqual({ tokens: { '--color-background-surface': '#fafafa' } });
  });

  it('ignores $-prefixed metadata on groups and tokens', () => {
    const tokens: DtcgTokens = {
      $description: 'a file',
      color: {
        $description: 'colors',
        accent: { $type: 'color', $value: '#3355ff', $description: 'seed', $extensions: { x: 1 } },
      },
    };
    expect(dtcgToAstryx(tokens)).toEqual({ color: { accent: '#3355ff' } });
  });

  it('returns an empty definition for an empty token file', () => {
    expect(dtcgToAstryx({})).toEqual({});
  });

  it('maps the platform base tokens without error', () => {
    const result = dtcgToAstryx(baseTokens);
    expect(result.color).toEqual({ accent: '#3355ff' });
    expect(result.tokens).toMatchObject({
      '--spacing-4': '1rem',
      '--radius-element': '8px',
    });
  });

  describe('rejects what it cannot map faithfully', () => {
    it('throws UnsupportedTokenType for an unknown $type, naming the path and type', () => {
      const tokens: DtcgTokens = {
        motion: { ease: { $type: 'cubicBezier', $value: [0, 0, 1, 1] } },
      };
      const act = () => dtcgToAstryx(tokens);
      expect(act).toThrow(UnsupportedTokenType);
      expect(act).toThrow(/motion\.ease/);
      expect(act).toThrow(/cubicBezier/);
    });

    it('throws UnsupportedTokenType for a token with no $type anywhere', () => {
      const tokens: DtcgTokens = { spacing: { '4': { $value: '1rem' } } };
      expect(() => dtcgToAstryx(tokens)).toThrow(UnsupportedTokenType);
    });

    it('throws UnmappedToken for a name that is not an Astryx token', () => {
      const tokens: DtcgTokens = {
        spacing: { '99': { $type: 'dimension', $value: '9rem' } },
      };
      const act = () => dtcgToAstryx(tokens);
      expect(act).toThrow(UnmappedToken);
      expect(act).toThrow(/--spacing-99/);
    });

    it('throws UnmappedToken when the path family does not fit the $type', () => {
      const tokens: DtcgTokens = {
        spacing: { '4': { $type: 'color', $value: '#ffffff' } },
      };
      expect(() => dtcgToAstryx(tokens)).toThrow(UnmappedToken);
    });

    it('throws InvalidTokenValue for an alias reference', () => {
      const tokens: DtcgTokens = {
        spacing: { '4': { $type: 'dimension', $value: '{spacing.2}' } },
      };
      expect(() => dtcgToAstryx(tokens)).toThrow(InvalidTokenValue);
    });

    it('throws InvalidTokenValue for an accent that is not a #RRGGBB seed', () => {
      const tokens: DtcgTokens = {
        color: { accent: { $type: 'color', $value: 'rebeccapurple' } },
      };
      expect(() => dtcgToAstryx(tokens)).toThrow(InvalidTokenValue);
    });

    it('throws InvalidTokenValue for a non-string value', () => {
      const tokens: DtcgTokens = {
        spacing: { '4': { $type: 'dimension', $value: 16 } },
      };
      expect(() => dtcgToAstryx(tokens)).toThrow(InvalidTokenValue);
    });
  });
});

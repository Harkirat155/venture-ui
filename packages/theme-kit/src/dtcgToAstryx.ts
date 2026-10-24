import { domainTokenDefaults, tokenDefaults } from '@astryxdesign/core/theme';
import type { DefineThemeInput, TokenName, TokenValue } from '@astryxdesign/core/theme';
import type { DtcgGroup, DtcgTokens } from '@venture-ui/tokens';

/**
 * Which Astryx token families each DTCG `$type` may write. The first path
 * segment names the family, so `spacing.4` is `--spacing-4`. Supporting another
 * `$type` is one entry here (plus a test).
 */
const TYPE_FAMILIES: ReadonlyMap<string, readonly string[]> = new Map([
  ['color', ['color']],
  ['dimension', ['spacing', 'size', 'radius', 'border']],
]);

/** A token whose `$type` (own or inherited) this mapping has no rule for, or has none at all. */
export class UnsupportedTokenType extends Error {
  override readonly name = 'UnsupportedTokenType';
  readonly path: string;
  readonly tokenType: string | undefined;
  constructor(path: string, tokenType: string | undefined) {
    super(
      tokenType === undefined
        ? `Token "${path}" has no $type (set it on the token or a parent group).`
        : `Token "${path}" has unsupported $type "${tokenType}" (supported: ${[...TYPE_FAMILIES.keys()].join(', ')}).`,
    );
    this.path = path;
    this.tokenType = tokenType;
  }
}

/** A token whose path is not an Astryx theme key for its `$type`, so it would silently do nothing. */
export class UnmappedToken extends Error {
  override readonly name = 'UnmappedToken';
  readonly path: string;
  constructor(path: string, cssVar: string, tokenType: string) {
    super(
      `Token "${path}" ($type "${tokenType}") maps to ${cssVar}, which is not an Astryx ${tokenType} token. ` +
        `Run \`pnpm exec astryx docs tokens\` for the names.`,
    );
    this.path = path;
  }
}

/** A token (or accent input) whose value cannot be used as written. */
export class InvalidTokenValue extends Error {
  override readonly name = 'InvalidTokenValue';
  readonly path: string;
  constructor(path: string, reason: string) {
    super(`Token "${path}" has an invalid value: ${reason}.`);
    this.path = path;
  }
}

/** The one DTCG color that is not a plain token: Astryx derives its palettes from this seed. */
const ACCENT_PATH = 'color.accent';

const HEX_SEED = /^#[0-9a-fA-F]{6}$/;
const ALIAS = /^\{.*\}$/;

type Mapped = {
  color?: { accent: string };
  tokens: Partial<Record<TokenName, TokenValue>>;
};

/** Validates an accent seed (`#RRGGBB`), the only form Astryx's palette generation accepts. */
export function assertAccentSeed(path: string, value: unknown): string {
  if (typeof value !== 'string' || !HEX_SEED.test(value)) {
    throw new InvalidTokenValue(path, `expected a #RRGGBB hex seed, got ${JSON.stringify(value)}`);
  }
  return value;
}

function isAstryxToken(cssVar: string): boolean {
  return Object.hasOwn(tokenDefaults, cssVar) || Object.hasOwn(domainTokenDefaults, cssVar);
}

function mapToken(path: readonly string[], type: string | undefined, value: unknown, out: Mapped): void {
  const dotted = path.join('.');
  const families = type === undefined ? undefined : TYPE_FAMILIES.get(type);
  if (type === undefined || families === undefined) throw new UnsupportedTokenType(dotted, type);
  if (typeof value !== 'string') {
    throw new InvalidTokenValue(dotted, `expected a string, got ${JSON.stringify(value)}`);
  }
  if (ALIAS.test(value)) {
    throw new InvalidTokenValue(dotted, `aliases (${value}) are not supported, write the literal value`);
  }
  if (type === 'color' && dotted === ACCENT_PATH) {
    out.color = { accent: assertAccentSeed(dotted, value) };
    return;
  }
  const cssVar = `--${path.join('-')}`;
  if (!families.includes(path[0] ?? '') || !isAstryxToken(cssVar)) {
    throw new UnmappedToken(dotted, cssVar, type);
  }
  out.tokens[cssVar as TokenName] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walk(group: DtcgGroup, path: readonly string[], inheritedType: string | undefined, out: Mapped): void {
  for (const [name, node] of Object.entries(group)) {
    if (name.startsWith('$')) continue;
    const here = [...path, name];
    if (!isRecord(node)) {
      throw new InvalidTokenValue(here.join('.'), 'expected a token or a group');
    }
    const type = typeof node.$type === 'string' ? node.$type : inheritedType;
    if ('$value' in node) {
      mapToken(here, type, node.$value, out);
    } else {
      walk(node as DtcgGroup, here, type, out);
    }
  }
}

/**
 * Maps DTCG tokens onto the keys Astryx `defineTheme` accepts:
 * - `color.accent` (`$type: color`) becomes the accent seed, `color.accent`.
 * - Other tokens become theme `tokens` entries named after their path
 *   (`color.background.surface` is `--color-background-surface`,
 *   `spacing.4` is `--spacing-4`), allowed for the colour and dimension types.
 *
 * `$type` is read from the token or inherited from a parent group. Anything it
 * cannot place faithfully throws instead of being skipped, because `defineTheme`
 * accepts unknown token names without complaint.
 */
export function dtcgToAstryx(tokens: DtcgTokens): Partial<DefineThemeInput> {
  const mapped: Mapped = { tokens: {} };
  walk(tokens, [], typeof tokens.$type === 'string' ? tokens.$type : undefined, mapped);
  return {
    ...(mapped.color ? { color: mapped.color } : {}),
    ...(Object.keys(mapped.tokens).length > 0 ? { tokens: mapped.tokens } : {}),
  };
}

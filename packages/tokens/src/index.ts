import baseJson from '../tokens/base.tokens.json' with { type: 'json' };
import type { DtcgTokens } from './dtcg.js';

export type { DtcgGroup, DtcgToken, DtcgTokens } from './dtcg.js';

/** The platform's product-neutral base tokens, in the W3C DTCG format. */
export const baseTokens: DtcgTokens = baseJson;

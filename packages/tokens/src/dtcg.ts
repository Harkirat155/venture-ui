/** A DTCG token: any object with a `$value`. `$type` may also be inherited from a parent group. */
export interface DtcgToken {
  readonly $value: unknown;
  readonly $type?: string;
  readonly $description?: string;
  readonly $extensions?: Readonly<Record<string, unknown>>;
}

/** A DTCG group: named child groups and tokens, plus an optional `$type` its tokens inherit. */
export interface DtcgGroup {
  readonly $type?: string;
  readonly $description?: string;
  readonly $extensions?: Readonly<Record<string, unknown>>;
  readonly [name: string]: DtcgToken | DtcgGroup | Readonly<Record<string, unknown>> | string | undefined;
}

/** The root of a DTCG file: a group. */
export type DtcgTokens = DtcgGroup;

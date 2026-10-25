# venture-ui

A shared design platform for a family of products, built on [Astryx](https://github.com/facebook/astryx) rather than
reinventing components. Each product keeps its own design system (brand tokens, voice, character) in its own repo and
plugs it in here; improvements flow back through pull requests.

> Working name — it will be renamed before the first package publish.

## Layers
| Layer | What it holds |
|---|---|
| `packages/tokens/` | `@venture-ui/tokens`: base design tokens in the W3C DTCG format (`baseTokens`), built with Style Dictionary into prefixed CSS variables (`tokens.css`) |
| `packages/theme-kit/` | `@venture-ui/theme-kit`: `dtcgToAstryx()`, a DTCG → Astryx `defineTheme` mapping, and `createProductTheme()` over it |
| `packages/ui/` | `@venture-ui/ui`: an Astryx integration package for shared components Astryx lacks, templates, codemods and docs (`gap-report` issues land in this repo); list them with `pnpm exec astryx component --list` |
| `elements/` | _Planned._ Framework-free custom elements for surfaces where React is too heavy (e.g. a browser-extension toast), styled by the same tokens |
| `examples/minimal-product/` | A tiny consumer app: the living example and the CI tree-shaking fixture |
| `examples/gallery/` | A consumer app that renders every component's stories, built like a product would (built theme, per-component imports). The Playwright tests run against it |
| `e2e/` | `@venture-ui/e2e`: Playwright screenshot and axe tests over the gallery, in light and dark at 390 and 1280 px |

## Rules
- Tree-shakes in every product build: ESM only, one subpath export per component, no side-effect barrels.
- A component moves here when a second product needs it (or it is generic by nature); domain-specific pieces stay in
  the product.
- Product themes and brand material never live here — this repo is public.

How a product uses it: [`docs/consuming.md`](docs/consuming.md). Licence: MIT.

## Develop
Node 24 and pnpm (the version is pinned in `packageManager`).

```bash
pnpm install
pnpm test          # vitest: tokens + theme-kit
pnpm build         # all packages in dependency order, then the example app
pnpm typecheck     # tsc in every package + `astryx integration check --strict` for @venture-ui/ui
pnpm theme:check   # the committed built theme in examples/minimal-product matches its source (run after pnpm build)
pnpm size          # size-limit budgets: the example's built JS, and each component on its own (run after pnpm build)
pnpm e2e           # Playwright over the built gallery, in the official Playwright image (needs Docker; run after pnpm build)
pnpm typecheck:tsrs # shadow check: tsrs vs tsc diagnostics per tsconfig, reports only (run after pnpm build)
```

After changing `theme.ts` or a token, run `pnpm build && pnpm theme:build` and commit the regenerated
`examples/minimal-product/src/example.*`. CI runs the same sequence.

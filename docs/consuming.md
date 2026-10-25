# Using venture-ui in a product

Every snippet below comes from [`examples/minimal-product/`](../examples/minimal-product), which CI builds, checks and
size-budgets on every push. Steps 1-4 work today; 5-7 are the outline of the contribution loop.

1. **Add the library** — as a git submodule for co-development (`git submodule add <repo> ui-lib`, list its packages
   in the product's pnpm workspace) or as a pinned package version.
2. **Write your product theme in your own repo** — DTCG tokens + `dtcgToAstryx` + `defineTheme`, built with
   `astryx theme build`.
3. **Import so it tree-shakes** — import from per-component subpaths, never a barrel.
4. **Let agents find it** — install `@venture-ui/ui` (Astryx loads it from your dependencies), run `astryx init`.
5. **Contribute back** — `astryx gap-report` / PR → Changeset → release → bump the pin in the product.
6. **Upgrade** — run the codemods; the Astryx version is pinned exactly.
7. **Browser floor** — Astryx Tier 1 needs CSS anchor positioning; load the polyfill conditionally for older browsers.

## 1. Add the library

Packages: `@venture-ui/tokens` (base DTCG tokens), `@venture-ui/theme-kit` (DTCG to Astryx theme) and `@venture-ui/ui`
(the Astryx integration: shared components Astryx lacks). They are ESM only, need Node 24, and pin Astryx exactly
(`@astryxdesign/core` and `@astryxdesign/theme-neutral` `0.7.4`).

```bash
git submodule add git@github.com:Harkirat155/venture-ui.git ui-lib
```

Put the packages in the product's `pnpm-workspace.yaml` and depend on them:

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - ui-lib/packages/*
```

```jsonc
// apps/web/package.json
{
  "dependencies": {
    "@astryxdesign/core": "0.7.4",
    "@astryxdesign/theme-neutral": "0.7.4",
    "@stylexjs/stylex": "0.19.1",
    "@venture-ui/theme-kit": "workspace:*",
    "@venture-ui/tokens": "workspace:*",
    "@venture-ui/ui": "workspace:*"
  },
  "devDependencies": { "@astryxdesign/cli": "0.7.4" }
}
```

The packages export a compiled `dist/` that is not committed. Build it after `pnpm install` and after every submodule
bump (pnpm builds the packages in dependency order):

```bash
pnpm --filter "./ui-lib/packages/*" build
```

## 2. Write your product theme

Keep your tokens, and the theme built from them, in your own repo; nothing product-specific goes in venture-ui. Tokens
are [W3C DTCG](https://www.w3.org/community/design-tokens/) JSON. `dtcgToAstryx` maps them onto what Astryx's
`defineTheme` accepts. It throws on anything it cannot place faithfully (an unsupported `$type`, an alias, a name that
is not an Astryx token), because `defineTheme` itself silently keeps unknown token names.

| DTCG token | Becomes |
|---|---|
| `color.accent` (`$type: color`, `#RRGGBB`) | the accent seed, `color.accent`; Astryx derives the accent, on-accent and neutral palettes from it |
| other `color.*` | a token named after the path: `color.background.surface` is `--color-background-surface` |
| `spacing.*`, `size.*`, `radius.*`, `border.*` (`$type: dimension`) | a token named after the path: `spacing.4` is `--spacing-4` |

`$type` can sit on the token or on a parent group. The platform's own tokens are `baseTokens` from
`@venture-ui/tokens`; a product usually writes its own file in the same shape.

The theme source is `src/theme.ts`, here the same file as `examples/minimal-product/src/theme.ts`:

```ts
import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { dtcgToAstryx } from '@venture-ui/theme-kit/dtcgToAstryx';
import { baseTokens } from '@venture-ui/tokens';

// The theme source, compiled by `pnpm theme:build` to example.css / example.js / example.d.ts beside this
// file; the app imports those built files (see main.tsx). `astryx theme build` only follows a literal
// defineTheme({ ... }) call to find the base theme's icons, so this is not written as createProductTheme(...).
const { color, tokens } = dtcgToAstryx(baseTokens);

export const exampleTheme = defineTheme({ name: 'example', extends: neutralTheme, color, tokens });
```

Compile it. Astryx writes `example.css`, `example.js` and `example.d.ts` beside the source. Commit them, and let CI fail
when they go stale:

```bash
pnpm exec astryx theme build src/theme.ts          # write the built theme
pnpm exec astryx theme build src/theme.ts --check  # CI: exit 1 if the committed outputs are stale
```

Why `defineTheme` is written out here instead of calling `createProductTheme`: `astryx theme build` reads the theme
file's source to find the base theme's icon registry, and it only follows a literal `defineTheme({ ... })` call.
Spreading a call (`...dtcgToAstryx(tokens)`) fails the same way, so the result is destructured first. A helper that
wraps `defineTheme` therefore cannot be the build entry while the base theme has icons, and `neutralTheme` does. (Both
failures were checked against 0.7.4.) Extending `@astryxdesign/theme-neutral/built` instead of the bare package gives
identical CSS and keeps the theme's source out of the app bundle.

`createProductTheme({ name, tokens, accent?, extends? })`, from `@venture-ui/theme-kit/createProductTheme`, is the same
thing in one call, for places that use a theme at runtime without building it: tests, Storybook, prototypes. An
`accent` input wins over a `color.accent` token.

## 3. Import so it tree-shakes

Load the two Astryx stylesheets first, then your built theme's CSS. Import each component from its own subpath and wrap
the tree in `Theme` with the built theme object. This is `examples/minimal-product/src/main.tsx`:

```tsx
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './example.css';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Theme } from '@astryxdesign/core/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { exampleTheme } from './example.js';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <Theme theme={exampleTheme}>
      <Center minHeight="100vh">
        <Button label="Hello from venture-ui" variant="primary" />
      </Center>
    </Theme>
  </StrictMode>,
);
```

- Import the built theme (`./example.js` and `./example.css`), never `theme.ts`: the source would pull `defineTheme` and
  the palette generator into the bundle.
- No StyleX compiler or Vite plugin is needed; Astryx ships compiled CSS. (`@stylexjs/stylex`, the runtime, is a peer dependency of `@astryxdesign/core`, so the product declares it.)
- A production build must really be one. With `NODE_ENV=development` exported in the shell, Vite keeps React's
  development forms; the example's `vite.config.ts` forces `NODE_ENV=production` for `vite build`.
- CSS custom properties from `@venture-ui/tokens/tokens.css` are prefixed `--vui-`. They are for surfaces that do not
  use Astryx (framework-free elements); Astryx components read Astryx's own variables.

`.size-limit.json` is the guard: CI fails when the example's built JS grows past its budget (measured gzip size + 5%).

## 4. Let agents find it

`@venture-ui/ui` is an Astryx integration (`packages/ui/astryx.integration.ts`). Astryx discovers an integration from a
direct dependency, so installing it is the whole wiring and `astryx.config` is optional:

```bash
pnpm exec astryx doctor   # "1 integration loaded from installed dependencies ... @venture-ui/ui"
pnpm exec astryx init     # writes Astryx's managed block into your AGENTS.md / CLAUDE.md
```

Its components show up in `pnpm exec astryx component --list` and `pnpm exec astryx search "<thing>"` in the
product, next to Astryx's own, and `pnpm exec astryx component <Name>` prints a component's props and examples. Missing something? `pnpm exec astryx
gap-report` files it at https://github.com/Harkirat155/venture-ui/issues, the `issuesUrl` in the manifest.

To name the integration explicitly instead, add it to `astryx.config.mjs`:

```js
export default { integrations: ['@venture-ui/ui'] };
```

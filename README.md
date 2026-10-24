# venture-ui

A shared design platform for a family of products, built on [Astryx](https://github.com/facebook/astryx) rather than
reinventing components. Each product keeps its own design system (brand tokens, voice, character) in its own repo and
plugs it in here; improvements flow back through pull requests.

> Working name — it will be renamed before the first package publish.

## Layers
| Layer | What it holds |
|---|---|
| `tokens/` | Base design tokens in the W3C DTCG format, built with Style Dictionary into CSS variables, an Astryx theme module and TS constants |
| `theme-kit/` | `createProductTheme()` over Astryx `defineTheme`, a DTCG → Astryx format, and a template for a product's design-system notes |
| `ui/` | An Astryx integration package: shared components Astryx lacks, templates, codemods and docs (`gap-report` issues land in this repo) |
| `elements/` | Framework-free custom elements for surfaces where React is too heavy (e.g. a browser-extension toast), styled by the same tokens |
| `examples/minimal-product/` | A tiny consumer app: the living example and the CI tree-shaking fixture |

## Rules
- Tree-shakes in every product build: ESM only, one subpath export per component, no side-effect barrels.
- A component moves here when a second product needs it (or it is generic by nature); domain-specific pieces stay in
  the product.
- Product themes and brand material never live here — this repo is public.

How a product uses it: [`docs/consuming.md`](docs/consuming.md). Licence: MIT.

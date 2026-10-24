# Using venture-ui in a product

> Filled in as the layers land (Watcher M0). Each section below gets a working example from
> `examples/minimal-product/`.

1. **Add the library** — as a git submodule for co-development (`git submodule add <repo> ui-lib`, list its packages
   in the product's pnpm workspace) or as a pinned package version.
2. **Write your product theme in your own repo** — DTCG tokens + `createProductTheme({ extends: base, … })`.
3. **Import so it tree-shakes** — import from per-component subpaths, never a barrel.
4. **Let agents find it** — `astryx init`, add the integration to `astryx.config`, paste the AGENTS.md snippet.
5. **Contribute back** — `astryx gap-report` / PR → Changeset → release → bump the pin in the product.
6. **Upgrade** — run the codemods; the Astryx version is pinned exactly.
7. **Browser floor** — Astryx Tier 1 needs CSS anchor positioning; load the polyfill conditionally for older browsers.

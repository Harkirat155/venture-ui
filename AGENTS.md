# AGENTS — venture-ui

Public, MIT-licensed shared design platform. Products consume it as a git submodule (co-development) or a pinned
package version.

- **Build on existing libraries.** Astryx is the component foundation; add a component only when Astryx lacks it,
  and check Astryx first (`npx @astryxdesign/cli component --list`, `search "<thing>"`).
- **Nothing product-specific or private here:** no product brand tokens, voice, character notes or unreleased names.
  Products keep their design systems in their own repos and plug them in with `theme-kit`.
- **Tree-shaking is a contract:** ESM only, per-component subpath exports, no side-effect barrels, `sideEffects`
  lists CSS only. CI fails if `examples/minimal-product` grows past its size budget.
- **Every component** ships with docs (`.doc.mjs`), a story, a Playwright screenshot and an axe check.
- **Third-party code:** keep licence notices in `THIRD_PARTY_NOTICES`; copy nothing from non-MIT/Pro libraries.
- Changes land through Changesets; products bump their pin after a release.

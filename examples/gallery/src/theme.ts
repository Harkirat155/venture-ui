import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { dtcgToAstryx } from '@venture-ui/theme-kit/dtcgToAstryx';
import { baseTokens } from '@venture-ui/tokens';

// The theme source, compiled by `pnpm theme:build` to gallery.css / gallery.js / gallery.d.ts beside this
// file; the app imports those built files (see main.tsx). `astryx theme build` only follows a literal
// defineTheme({ ... }) call to find the base theme's icons, so this is not written as createProductTheme(...).
const { color, tokens } = dtcgToAstryx(baseTokens);

export const galleryTheme = defineTheme({ name: 'gallery', extends: neutralTheme, color, tokens });

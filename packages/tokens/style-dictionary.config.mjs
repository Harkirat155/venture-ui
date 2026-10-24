// Style Dictionary build for @venture-ui/tokens: DTCG tokens -> dist/tokens.css.
// The CSS variables carry a `vui` prefix so they never collide with Astryx's own
// `--color-*` / `--spacing-*` variables; they exist for surfaces that do not use
// Astryx (framework-free elements, extensions). The default export is the config
// object, read by `style-dictionary build` and by the tests.
export default {
  source: ['tokens/**/*.tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'vui',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: { showFileHeader: false, outputReferences: true },
        },
      ],
    },
  },
};

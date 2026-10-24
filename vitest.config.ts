import { defineConfig } from 'vitest/config';

// Vitest reads its config from a default export.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
  },
});

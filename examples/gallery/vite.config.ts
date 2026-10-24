import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite reads its config from a default export.
export default defineConfig(({ command }) => {
  // A build is always a production build, even when the shell exports
  // NODE_ENV=development: React and the JSX transform would otherwise ship their
  // development forms, and the size budget would measure the wrong thing.
  if (command === 'build') process.env.NODE_ENV = 'production';
  return { plugins: [react()] };
});

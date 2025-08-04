import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Ensure all tests get storage polyfills before modules import
    setupFiles: ['tests/setup.polyfills.ts', 'src/setupTests.ts'],
    // Use Node environment for library tests; switch to 'jsdom' for DOM-heavy tests
    environment: 'node',
  },
});

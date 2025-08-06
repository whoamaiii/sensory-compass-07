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
    setupFiles: ['tests/setup.polyfills.ts', 'src/setupTests.ts', 'tests/setup.ts'],
    // Use jsdom for React component testing
    environment: 'jsdom',
  },
});

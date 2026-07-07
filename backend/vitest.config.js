// backend/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['index.js'],
      exclude: ['node_modules/**', 'test/**']
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
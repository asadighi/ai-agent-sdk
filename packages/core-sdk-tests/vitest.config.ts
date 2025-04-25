import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    alias: {
      '@ai-agent/core-sdk': resolve(__dirname, '../core-sdk/src'),
    },
    deps: {
      inline: ['@ai-agent/core-sdk'],
      interopDefault: true,
      registerNodeLoader: true,
    },
    testTimeout: 10000,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
}); 
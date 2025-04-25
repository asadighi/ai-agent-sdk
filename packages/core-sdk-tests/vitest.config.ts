import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    alias: {
      '@ai-agent/core-sdk': resolve(__dirname, '../core-sdk/src'),
    },
    deps: {
      interopDefault: true,
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: false
      }
    }
  },
}); 
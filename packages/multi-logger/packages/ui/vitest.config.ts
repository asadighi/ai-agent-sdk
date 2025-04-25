import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    setupFiles: ['src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@ai-agent/multi-logger/types': resolve(__dirname, '../types/src'),
      '@ai-agent/multi-logger': resolve(__dirname, '../')
    }
  }
}); 
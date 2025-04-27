import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/__tests__/',
                '**/*.d.ts'
            ]
        }
    },
    resolve: {
        alias: {
            '@ai-agent/control-plane': path.resolve(__dirname, '../types/src'),
            '@ai-agent/multi-logger': path.resolve(__dirname, '../../../multi-logger/packages/types/src')
        }
    }
}); 
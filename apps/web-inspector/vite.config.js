import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import eslint from 'vite-plugin-eslint';
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        eslint({
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            failOnError: false,
        }),
    ],
    resolve: {
        alias: {
            '@ai-agent/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
            '@ai-agent/multi-logger': path.resolve(__dirname, '../../packages/multi-logger/dist/web')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    envDir: '.', // Look for .env files in the web app directory
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: [
                'firebase/firestore',
                'firebase/app',
                'fs',
                'path',
                'fs/promises'
            ],
            output: {
                globals: {
                    'firebase/firestore': 'firebase.firestore',
                    'firebase/app': 'firebase.app'
                }
            }
        }
    },
    optimizeDeps: {
        exclude: ['firebase/firestore', 'firebase/app']
    }
});
//# sourceMappingURL=vite.config.js.map
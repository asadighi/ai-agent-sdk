import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ai-agent/sdk': path.resolve(__dirname, '../../packages/sdk/src')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  envDir: '.',  // Look for .env files in the web app directory
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['firebase/firestore', 'firebase/app'],
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
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@context': path.resolve(__dirname, './src/context'),
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001',
      '/config': 'http://localhost:5001',
      '/classify': 'http://localhost:5001',
      '/export': 'http://localhost:5001',
      '/submit_corrections': 'http://localhost:5001',
      '/kb': 'http://localhost:5001',
      '/settings': 'http://localhost:5001',
      '/login': 'http://localhost:5001',
      '/logout': 'http://localhost:5001',
      '/static': 'http://localhost:5001',
    }
  },
  build: {
    outDir: '../vaas/web/static/dist',
    emptyOutDir: true,
  }
})

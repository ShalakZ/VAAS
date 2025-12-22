import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Backend port for API proxy (default: 5001)
const backendPort = process.env.VITE_BACKEND_PORT || 5001
const backendUrl = `http://localhost:${backendPort}`

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
      '/api': backendUrl,
      '/config': backendUrl,
      '/classify': backendUrl,
      '/export': backendUrl,
      '/submit_corrections': backendUrl,
      '/kb': backendUrl,
      '/settings': backendUrl,
      '/login': backendUrl,
      '/logout': backendUrl,
      '/static': backendUrl,
    }
  },
  build: {
    outDir: '../vaas/web/static/dist',
    emptyOutDir: true,
  }
})

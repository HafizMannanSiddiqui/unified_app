import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read backend port from backend .env
function getBackendPort(): number {
  try {
    const envFile = readFileSync(resolve(__dirname, '../backend-nest/.env'), 'utf-8')
    const match = envFile.match(/^PORT=(\d+)/m)
    return match ? parseInt(match[1]) : 4000
  } catch {
    return 4000
  }
}

const BACKEND_PORT = getBackendPort()

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { src: '/src' } },
  server: {
    port: 3002,
    proxy: {
      // Swagger docs — forward as-is (no rewrite)
      '/api/docs': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/api/docs-json': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      // All other API calls — strip /api prefix
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
})

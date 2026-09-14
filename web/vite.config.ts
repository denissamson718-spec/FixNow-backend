import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

const webDir = fileURLToPath(new URL('.', import.meta.url))
const projectDir = fileURLToPath(new URL('../', import.meta.url))

export default defineConfig(({ mode }) => {
  const appEnv = loadEnv(mode, projectDir, 'EXPO_PUBLIC_')
  const webEnv = loadEnv(mode, webDir, 'VITE_')
  const target = (webEnv.VITE_API_URL?.trim() || appEnv.EXPO_PUBLIC_BACKEND_URL?.trim() || 'http://127.0.0.1:4010').replace(/\/$/, '')

  return {
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target,
        changeOrigin: true
      }
    }
  }
  }
})

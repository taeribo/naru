import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PROXY = {
  '/api': {
    target: process.env.NARU_API_TARGET ?? 'http://127.0.0.1:8080',
    ws: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: { strictPort: true, proxy: API_PROXY },
  preview: { proxy: API_PROXY },
})

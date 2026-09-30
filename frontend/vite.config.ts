import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API requests during development to the FastAPI backend
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

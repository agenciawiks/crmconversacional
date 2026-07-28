import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/n8n-webhook': {
        target: 'https://n8n-n8n.rh3fr2.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n-webhook/, '')
      }
    }
  }
})

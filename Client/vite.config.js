import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
      // 0.0.0.0 para que el dev server sea accesible fuera del contenedor
      host: true,
      port: 3000,
      strictPort: true,
      watch: {
        // necesario para hot-reload con volúmenes montados en Docker (macOS/Windows)
        usePolling: true
      }
  }
})

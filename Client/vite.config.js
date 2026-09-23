import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El contenedor de producción hace `vite build` y sirve dist/ con `serve`
// (ver Dockerfile y serve.json), que es donde se aplican las cabeceras de
// seguridad (CSP, HSTS, etc.). En build, Vite emite el CSS como
// <link rel="stylesheet"> y el JS como <script src>, sin código en línea, lo
// que permite una CSP estricta sin 'unsafe-inline'.
//
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Config usada solo si se corre `vite dev` localmente (fuera de Docker).
    host: true,
    port: 3000,
    strictPort: true
  }
})

# ── Etapa 1: build de producción con Vite ─────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm install

COPY . .

# Genera dist/ con el CSS como <link> y el JS como <script src> (sin inline),
# lo que permite una CSP estricta sin 'unsafe-inline'.
RUN npm run build

# ── Etapa 2: servir los archivos estáticos con cabeceras de seguridad ──────────
FROM node:20-alpine

WORKDIR /app

# 'serve' es un servidor estático liviano que aplica las cabeceras de serve.json.
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist
COPY serve.json ./dist/serve.json

EXPOSE 3000

# -s: modo SPA (todas las rutas sirven index.html). -l: puerto.
CMD ["serve", "-s", "dist", "-l", "3000"]

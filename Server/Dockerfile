FROM node:20-alpine

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3002

CMD ["node", "main.js"]

FROM node:20-alpine

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

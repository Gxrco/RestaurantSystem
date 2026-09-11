# RestaurantSystem

El proyecto implica crear una base de datos para gestionar las operaciones de un restaurante, incluyendo áreas, mesas, pedidos, pagos y encuestas de satisfacción. Se deben implementar funciones como inicio de sesión seguro, toma de pedidos y registro de quejas.

![image](https://github.com/DiegoDuaS/RestaurantSystem/assets/110642453/acbbe0bb-037c-4e1a-ae5b-9eb0397baa9f)

## Índice

- [Instalación](#instalación)
- [Ejecución](#ejecución)
- [Créditos](#créditos)

## Instalación

Solo necesitas [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose).

1. Clona este repositorio en tu máquina local:

```bash
git clone git@github.com:DiegoDuaS/RestaurantSystem.git
cd RestaurantSystem
```

2. (Opcional) Copia el archivo de variables de entorno si quieres cambiar puertos o credenciales:

```bash
cp .env.example .env
```

Si no creas el `.env`, Compose usa los valores por defecto definidos en `docker-compose.yml`.

## Ejecución

Levanta **todo el stack (Frontend + Backend + Base de datos) con un solo comando**:

```bash
docker compose up --build
```

La primera vez tarda un poco porque construye las imágenes e inicializa la base de datos con
`SQL DB/proy2 (2).sql` (esquema, funciones, triggers y datos de prueba).

### Enlaces

| Servicio | URL / Conexión | Descripción |
|----------|----------------|-------------|
| Frontend | http://localhost:3000 | Aplicación React (Vite) |
| Backend | http://localhost:3002 | API REST en Express |
| Base de datos | `postgresql://postgres:postgres@localhost:5432/restaurante` | PostgreSQL 16 |

El frontend apunta al backend mediante la variable `VITE_API_URL`, y el backend se conecta a la base
de datos con `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`; todas están configuradas en `docker-compose.yml`.

### Comandos útiles

```bash
docker compose up -d --build     # levantar en segundo plano
docker compose logs -f           # ver logs de los 3 servicios
docker compose restart server    # reiniciar el backend tras cambiar código
docker compose down              # detener y eliminar los contenedores
docker compose down -v           # además borra el volumen de la DB (reinicializa el .sql)
```

El código de `Client/` y `Server/` está montado como volumen: el frontend recarga en caliente y el
backend solo necesita `docker compose restart server`.

### Ejecución sin Docker (opcional)

```bash
cd Server && npm install && npm start   # requiere PostgreSQL local; usa PGHOST, PGUSER, etc.
cd Client && npm install && npm run dev # usa VITE_API_URL o http://localhost:3002 por defecto
```

## Imágenes 

![image](https://github.com/user-attachments/assets/275da64d-1ea0-4b90-bfd6-56f4d6212b48)
![image](https://github.com/user-attachments/assets/4352efa0-898d-4762-ab6b-7b73b3495452)
![image](https://github.com/user-attachments/assets/ccc8ba3d-fc80-4c8a-855d-848888fdda7a)

## Créditos 

Este proyecto fue desarrollado por:

- Diego Duarte Slowing [Github](https://github.com/DiegoDuaS)
- Maria Jose Villafuerte Arredondo [Github](https://github.com/Maria-Villafuerte)
- Fabiola Alejandra Contreras Colindres [Github](https://github.com/Fabiola-cc)

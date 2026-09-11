// URL base del backend. En Docker se inyecta vía VITE_API_URL (ver docker-compose.yml).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

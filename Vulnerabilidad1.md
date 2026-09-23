# Vulnerabilidad 1 — Content Security Policy (CSP) Header Not Set

**Proyecto:** RestaurantSystem — *El Fogón Dorado*
**Fecha de remediación:** 2026-09-22
**Severidad:** Media
**Categoría OWASP:** A05:2021 – Security Misconfiguration
**Referencias:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers)

> **Actualización (endurecimiento):** tras el primer arreglo, un nuevo escaneo
> de ZAP reportó cinco hallazgos derivados de la propia CSP y del transporte:
> *CSP: Failure to Define Directive with No Fallback*, *CSP: Wildcard Directive*,
> *CSP: script-src unsafe-inline*, *CSP: style-src unsafe-inline* y
> *HTTP Only Site*. Todos se resolvieron; ver la **sección 9**.

---

## 1. Descripción de la vulnerabilidad

Ni el servidor de aplicación (frontend, Vite, puerto `3000`) ni la API (backend,
Express, puerto `3002`) incluían la cabecera HTTP **`Content-Security-Policy`**
en sus respuestas.

La CSP es un mecanismo de defensa en profundidad que le indica al navegador
**desde qué orígenes puede cargar y ejecutar recursos** (scripts, estilos,
imágenes, fuentes, conexiones, etc.). En su ausencia, el navegador aplica su
comportamiento por defecto —permisivo—, de modo que si un atacante consigue
inyectar contenido en la página (Cross-Site Scripting, XSS), ese contenido se
ejecuta sin restricción: puede cargar scripts de dominios externos, exfiltrar
datos, o robar credenciales y tokens.

En una aplicación que maneja **credenciales de empleados, datos personales de
clientes e información financiera**, la falta de esta cabecera amplía el impacto
de cualquier fallo de inyección.

### Evidencia (antes)

Respuesta del backend (`GET http://localhost:3002/`):

```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
...
```

Respuesta del frontend (`GET http://localhost:3000/`):

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: text/html
...
```

En ambas respuestas **no aparece** ninguna directiva `Content-Security-Policy`.
Adicionalmente, el backend revelaba la cabecera `X-Powered-By: Express`, que
filtra la tecnología del servidor (fuga de información de la misma familia de
*misconfiguration*).

---

## 2. Impacto

| Vector                           | Descripción                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **XSS reforzado**          | Sin CSP, un script inyectado puede cargar código desde cualquier origen y enviar datos a un servidor controlado por el atacante. |
| **Clickjacking**           | Sin`frame-ancestors`, la página puede incrustarse en un `<iframe>` de un sitio malicioso para engañar al usuario.           |
| **Exfiltración de datos** | Sin`connect-src`, un script podría abrir conexiones a dominios arbitrarios.                                                    |
| **Inyección de recursos** | Sin`object-src`/`base-uri`, se pueden cargar plugins o alterar la resolución de URLs relativas.                              |

---

## 3. Análisis previo a la corrección

Antes de definir la política se revisó **qué recursos necesita realmente la
aplicación**, para no romper funcionalidad con una CSP demasiado estricta:

- El frontend **no consume recursos externos**: no usa CDNs, ni Google Fonts,
  ni scripts de terceros. React, los estilos y `react-icons` se empaquetan
  localmente; los iconos se renderizan como **SVG en línea** dentro del DOM
  (no son peticiones de red).
- La app corre en **modo desarrollo de Vite**, que impone dos requisitos:
  1. Inyecta un `<script>` **inline** (el preámbulo de React Refresh) → requiere
     `'unsafe-inline'` en `script-src`.
  2. Usa un **WebSocket** para el Hot Module Replacement (HMR) → requiere `ws:`
     en `connect-src`.
- El navegador habla con la API en `http://localhost:3002` → debe permitirse en
  `connect-src`.
- La API **solo devuelve JSON**, nunca HTML, por lo que admite una política
  mucho más estricta (`default-src 'none'`).

---

## 4. Solución aplicada

Se añadió la cabecera `Content-Security-Policy` (más cabeceras de seguridad
complementarias) en **las dos capas**, sin introducir dependencias nuevas.

### 4.1 Backend — `Server/main.js`

Se agregó un middleware de Express que se ejecuta antes de las rutas y se
deshabilitó la cabecera `X-Powered-By`:

```js
app.disable('x-powered-by'); // no revelar que el backend es Express
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
```

Como la API solo emite JSON, la política es máximamente restrictiva:
`default-src 'none'` bloquea la carga de **cualquier** recurso.

### 4.2 Frontend — `Client/vite.config.js`

Se añadió un plugin que inyecta la CSP y cabeceras afines en cada respuesta del
dev server de Vite (así aparece como **cabecera HTTP real**, que es lo que
detectan los escáneres como OWASP ZAP / Nessus):

```js
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' ws: http://localhost:3002",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'"
].join('; ')

function securityHeaders() {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', csp)
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('Referrer-Policy', 'no-referrer')
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), securityHeaders()],
  // ...
})
```

### 4.3 Frontend — `Client/index.html` (respaldo)

Se añadió una CSP equivalente vía `<meta http-equiv>`, como defensa adicional
por si el HTML se sirviera como archivo estático (build) sin pasar por el dev
server:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: http://localhost:3002; object-src 'none'; base-uri 'self'" />
```

> Nota: las directivas `frame-ancestors` y `form-action` se ignoran cuando se
> declaran vía `<meta>`; solo tienen efecto como cabecera HTTP. Por eso el plugin
> del dev server sigue siendo la fuente principal, y el `<meta>` es respaldo.

---

## 5. Justificación de las directivas

| Directiva           | Valor                                 | Motivo                                                                                                                           |
| ------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'` (front) / `'none'` (API) | Base restrictiva: solo el propio origen; la API no carga nada.                                                                   |
| `script-src`      | `'self' 'unsafe-inline'`            | `'unsafe-inline'` es un requisito del **dev server** de Vite (preámbulo React Refresh). En producción debe eliminarse. |
| `style-src`       | `'self' 'unsafe-inline'`            | React inyecta estilos en línea durante desarrollo.                                                                              |
| `img-src`         | `'self' data:`                      | Permite imágenes propias y SVG/íconos embebidos como`data:`.                                                                 |
| `connect-src`     | `'self' ws: http://localhost:3002`  | `ws:` para el HMR de Vite; el `localhost:3002` para llamar a la API.                                                         |
| `object-src`      | `'none'`                            | Bloquea`<object>`/`<embed>`/plugins.                                                                                         |
| `base-uri`        | `'self'` / `'none'`               | Impide reescribir la URL base para secuestrar rutas relativas.                                                                   |
| `frame-ancestors` | `'none'`                            | Anti-clickjacking: la página no puede incrustarse en iframes.                                                                   |
| `form-action`     | `'self'` / `'none'`               | Restringe a dónde pueden enviarse los formularios.                                                                              |

Cabeceras complementarias añadidas: `X-Content-Type-Options: nosniff`
(evita *MIME sniffing*), `X-Frame-Options: DENY` (refuerzo anti-clickjacking
para navegadores antiguos) y `Referrer-Policy: no-referrer`.

---

## 6. Verificación

Tras reconstruir las imágenes (`docker compose up --build -d`) se comprobaron
las respuestas:

**Backend (`http://localhost:3002/`):**

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

(la cabecera `X-Powered-By` ya **no** aparece)

**Frontend (`http://localhost:3000/`):**

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: http://localhost:3002; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

**Pruebas de no regresión (la aplicación sigue funcionando):**

- `POST /login` con `id=1` y contraseña `1234` → `{"userId":1}` (200 OK).
- El frontend carga sin errores de CSP: Vite arranca limpio, `main.jsx` se sirve
  con HTTP 200 y el HMR (WebSocket) funciona.

---

## 7. Archivos modificados

| Archivo                   | Cambio                                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| `Server/main.js`        | Middleware de cabeceras de seguridad +`app.disable('x-powered-by')`. |
| `Client/vite.config.js` | Plugin`security-headers` que envía la CSP en el dev server.         |
| `Client/index.html`     | `<meta http-equiv="Content-Security-Policy">` de respaldo.           |

---

## 8. Recomendaciones para producción

La política actual está ajustada al **modo desarrollo** de Vite. Al pasar a
producción (`vite build` + servidor estático / reverse proxy) se recomienda:

1. **Eliminar `'unsafe-inline'`** de `script-src` y `style-src`, usando en su
   lugar *hashes* o *nonces* por recurso. En build, Vite ya no inyecta el
   preámbulo inline de React Refresh, por lo que deja de ser necesario.
2. **Quitar `ws:`** de `connect-src` (el HMR no existe en producción) y fijar el
   origen real de la API en lugar de `http://localhost:3002`.
3. Servir la cabecera desde el **reverse proxy** (nginx / Traefik) o el servidor
   estático definitivo, no desde el dev server.
4. Añadir `Strict-Transport-Security` (HSTS) una vez el despliegue use HTTPS.
5. Considerar el uso de **`helmet`** en el backend para gestionar todas estas
   cabeceras de forma centralizada.

---

## 9. Endurecimiento: eliminación de los 5 hallazgos derivados

Un segundo escaneo de ZAP, ya con la CSP presente, generó cinco hallazgos
derivados. Se resolvieron todos. La decisión de fondo fue **dejar de servir el
frontend con el dev server de Vite y pasarlo a un build de producción**, porque
la mayoría de los hallazgos venían de concesiones propias del modo desarrollo.

### 9.1 Hallazgos y causa

| Hallazgo ZAP | Causa raíz |
|--------------|------------|
| **CSP: script-src unsafe-inline** | El dev server de Vite inyectaba un `<script>` inline (preámbulo de React Refresh), que obligaba a `'unsafe-inline'`. |
| **CSP: style-src unsafe-inline** | En modo dev, Vite inyecta el CSS como `<style>` vía JavaScript, que también requiere `'unsafe-inline'`. |
| **CSP: Wildcard Directive** | La API respondía con `Access-Control-Allow-Origin: *` (CORS abierto con comodín). |
| **CSP: Failure to Define Directive with No Fallback** | Faltaban directivas que no heredan de `default-src` (p. ej. `form-action`, `frame-src`, `worker-src`, `manifest-src`, `base-uri`…), quedando sin control explícito. |
| **HTTP Only Site** | El sitio respondía solo por HTTP, sin cabecera que promoviera HTTPS. |

### 9.2 Cambios aplicados

**a) Frontend servido como build estático (elimina ambos `unsafe-inline`).**
El contenedor del cliente pasó de `vite dev` a **`vite build` + `serve`**
(servidor estático). En el build:

- El CSS se emite como `<link rel="stylesheet">` (recurso servido, no `<style>`
  inline) → `style-src 'self'` sin `'unsafe-inline'`.
- El JS se emite como `<script src>` (sin preámbulo inline) → `script-src 'self'`
  sin `'unsafe-inline'`.

Se implementó con un **Dockerfile multi-etapa** (`Client/Dockerfile`): una etapa
compila con `npm run build` y otra sirve `dist/` con `serve`, que aplica las
cabeceras definidas en `Client/serve.json`.

**b) CSP estricta y completa (elimina "unsafe-inline" y "No Fallback").**
La política del frontend quedó, sin comodines ni código en línea y con todas las
directivas declaradas explícitamente:

```
default-src 'self'; script-src 'self'; script-src-elem 'self';
style-src 'self'; style-src-elem 'self'; img-src 'self' data:;
font-src 'self' data:; connect-src 'self' http://localhost:3002;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none';
frame-ancestors 'none'; worker-src 'self'; manifest-src 'self';
media-src 'self'; child-src 'none'; upgrade-insecure-requests
```

**c) CORS restringido en el backend (elimina "Wildcard Directive").**
Se sustituyó `app.use(cors())` (que emitía `Access-Control-Allow-Origin: *`) por
una lista blanca de orígenes:

```js
const allowedOrigins = (process.env.CORS_ORIGIN ||
  'http://localhost:3000,http://127.0.0.1:3000').split(',').map(o => o.trim());
app.use(cors({ origin: allowedOrigins, methods: ['GET','POST'], allowedHeaders: ['Content-Type'] }));
```

**d) HSTS + upgrade-insecure-requests (elimina "HTTP Only Site").**
Ambas capas envían ahora `Strict-Transport-Security: max-age=31536000;
includeSubDomains`, y la CSP incluye `upgrade-insecure-requests`.

### 9.3 Verificación del endurecimiento

Cabeceras del **frontend** (`http://localhost:3000/`) — sin `unsafe-inline`, sin
comodines, con HSTS:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; script-src-elem 'self'; style-src 'self'; style-src-elem 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:3002; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self'; media-src 'self'; child-src 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

El HTML servido usa recursos externos, no inline:

```html
<script type="module" crossorigin src="/assets/index-CQUZNoHp.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-DT6BtbBO.css">
```

CORS del **backend**: refleja el origen permitido y rechaza el resto:

```
Origin: http://localhost:3000  → Access-Control-Allow-Origin: http://localhost:3000
Origin: http://evil.com        → (sin Access-Control-Allow-Origin)
```

**Pruebas de no regresión en navegador real (Playwright / Chromium headless):**

- La página carga **con todos sus estilos** (1 hoja de estilo aplicada, login
  renderizado correctamente).
- **Cero violaciones de CSP** en consola, tanto al cargar como tras iniciar sesión.
- Login end-to-end `id=1 / 1234`: la llamada `POST /login` devuelve **200**, no
  hay violaciones de CSP (el `fetch` cross-origin pasa por `connect-src`) y la
  aplicación avanza a la pantalla principal.

### 9.4 Archivos añadidos/modificados en el endurecimiento

| Archivo | Cambio |
|---------|--------|
| `Client/Dockerfile` | Reescrito como build multi-etapa: `vite build` + `serve` estático. |
| `Client/serve.json` | **Nuevo.** Cabeceras de seguridad (CSP estricta, HSTS, etc.) del servidor estático. |
| `Client/vite.config.js` | Simplificado; la CSP ya no depende del dev server (se sirve en build). |
| `Client/index.html` | `<meta>` CSP actualizado a la política estricta (sin `unsafe-inline`). |
| `Server/main.js` | `Strict-Transport-Security` + `Permissions-Policy`; CORS restringido a lista blanca. |

> **Nota sobre HTTPS:** `HTTP Only Site` se mitiga a nivel de aplicación con HSTS
> y `upgrade-insecure-requests`. La resolución **completa** requiere servir el
> sitio efectivamente por **HTTPS** (certificado TLS en un reverse proxy como
> nginx/Traefik/Caddy delante de los contenedores). En un entorno de laboratorio
> local sobre `http://localhost` esto suele quedar fuera de alcance, pero debe
> hacerse en cualquier despliegue real.

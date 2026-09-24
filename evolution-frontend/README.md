# evolution-frontend - Frontend del reto (Parte 2 de los ejercicios 1 y 2)

Un solo frontend en **Vue 3 + Vite** para los dos servicios, como permite el enunciado:

| Pestaña | Servicio | Endpoint |
|---|---|---|
| Traductor de Endosos | endorse-service | `POST /v1/endorse/translate` |
| Rutas Óptimas | routes-service | `POST /v1/routes/optimal` |

- **Traductor de Endosos**: formulario con los 11 campos del JSON plano del enunciado, precargados con su
  ejemplo. Un bloque "Campos adicionales" permite enviar claves que lea otra plantilla (por ejemplo
  `beneficiario` para `VidaFlex`). Los campos vacíos no se envían, para que la plantilla aplique su default
  o reporte el faltante. La respuesta se muestra como JSON formateado.
- **Rutas Óptimas**: textarea precargado con el contenido exacto de `routes-service/ejemplo.json`
  (un test verifica que sigan idénticos). Muestra `fromDepot`, `to`, el `path` como `A → B → C` y `distance`.
- **Errores**: ambos servicios responden `{error, code, details?}`. Se muestra el código, el mensaje y,
  si `details` trae `missingFields` o `fields`, la lista. Los errores del propio cliente usan el mismo formato:
  `NETWORK_ERROR` (servicio caído o bloqueado por CORS), `CONFIG_ERROR` (faltan credenciales),
  `INVALID_JSON` (el textarea no es JSON válido).
- Estados: cargando (botón deshabilitado), éxito y error. CSS propio, sin librerías de UI. Sin router:
  son dos vistas sin URLs propias, así que alcanza con estado local.

## Estructura

```
src/
  api/client.js      → cliente por servicio: token en memoria, reintento único ante 401
  api/errors.js      → ApiError a partir del sobre {error, code, details}
  api/services.js    → una instancia por servicio, configurada por env
  components/        → EndorseTab, RoutesTab, ErrorPanel
  examples/          → copia de routes-service/ejemplo.json
tests/               → Vitest del cliente API y del ejemplo precargado
```

## Autenticación

Cada servicio emite su propio token (`POST {base}/v1/auth/token` con `{clientId, clientSecret}`):

1. Antes de la primera llamada a un servicio se pide su token con las credenciales del env.
2. El `accessToken` se guarda **solo en memoria** (una variable dentro del cliente), uno por servicio.
   Nunca en `localStorage` ni `sessionStorage`: recargar la página obliga a pedir uno nuevo.
3. Si una llamada responde 401 (token vencido o inválido), se renueva el token y se reintenta **una sola vez**.
   Si vuelve a fallar, se muestra el error.

## Ejecutar

Requiere los dos servicios levantados, con `CORS_ORIGIN` que incluya `http://localhost:5173`.

```bash
npm install
cp .env.example .env    # completa las credenciales de cada servicio
npm run dev             # http://localhost:5173
npm test                # Vitest
npm run build           # bundle estático en dist/
```

### Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `VITE_ENDORSE_API_URL` | `http://localhost:3001` | URL base de endorse-service |
| `VITE_ROUTES_API_URL` | `http://localhost:8080` | URL base de routes-service |
| `VITE_ENDORSE_CLIENT_ID` / `VITE_ENDORSE_CLIENT_SECRET` | - | Deben coincidir con `CLIENT_ID` / `CLIENT_SECRET` de endorse-service |
| `VITE_ROUTES_CLIENT_ID` / `VITE_ROUTES_CLIENT_SECRET` | - | Deben coincidir con `CLIENT_ID` / `CLIENT_SECRET` de routes-service |

Vite lee las variables al compilar: tras cambiar `.env` hay que reiniciar `npm run dev` o volver a hacer el build.

## Prueba de integración (Playwright)

`npm run e2e` levanta los tres procesos reales y recorre las dos pestañas en Chromium headless:
endorse-service (puerto 3001, con build y seed en `data/e2e.sqlite`), routes-service (`go run .`) y el
frontend (`npm run dev`). Cada servicio usa sus propias credenciales de prueba y `CORS_ORIGIN=http://localhost:5173`.

```bash
npx playwright install chromium   # solo la primera vez
npm run e2e
```

Requiere Node, Go en el `PATH` y las carpetas hermanas `../endorse-service` y `../routes-service`.
routes-service usa el puerto **8081** por defecto en esta prueba (en la máquina de desarrollo el 8080 estaba
ocupado por otra aplicación); `E2E_ROUTES_PORT=8080 npm run e2e` lo cambia.

Cubre: salida exacta del PDF, botón deshabilitado durante la carga, 422 `MISSING_FIELDS`, 404 `TEMPLATE_NOT_FOUND`,
400 `VALIDATION`, plantilla `VidaFlex` con un campo extra, token solo en memoria con reintento único ante 401
(el primer 401 se simula interceptando la respuesta; el reintento llega al servicio real), rutas de uno y varios
saltos, 422 `UNREACHABLE`, base inexistente y JSON inválido sin llamar al servicio.

## Trade-off de seguridad

Todo lo que empieza con `VITE_` queda **embebido en el bundle** de JavaScript. Las credenciales del cliente,
por lo tanto, son visibles para cualquiera que abra las herramientas del navegador: con ellas se puede pedir
un token y llamar a los servicios directamente. Viven en el frontend **solo por el alcance del reto**, para
tener un flujo completo sin infraestructura adicional. Guardar el token solo en memoria reduce la exposición
del token (no sobrevive en el almacenamiento del navegador), pero no protege el secreto.

En producción se usaría una de estas opciones:

- **BFF (Backend for Frontend)**: un backend propio custodia las credenciales, pide los tokens y reenvía las
  llamadas; el navegador nunca ve el secreto y se autentica contra el BFF con una cookie de sesión `HttpOnly`.
- **Authorization Code + PKCE** con un proveedor de identidad: el usuario inicia sesión, el frontend obtiene
  un token de usuario de vida corta sin ningún secreto embebido, y los servicios validan ese token.

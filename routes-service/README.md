# routes-service - Servicio de Rutas Óptimas (Ejercicio 2)

Servicio en **Golang (stdlib, sin dependencias)** que calcula la ruta más corta
entre la base de grúas más cercana y el distrito del siniestro, usando **Dijkstra**
con cola de prioridad y soporte **multi-depósito**.

## Arquitectura
```
main.go                          → arranque: http.Server con timeouts e inyección del servicio
config.go                        → configuración por entorno (falla si faltan secretos)
internal/api/                    → capa HTTP versionada /v1
  routes.go                      → Config y NewMux(cfg, svc): registro de rutas
  middleware.go                  → CORS por CORS_ORIGIN, límite de 1 MB en el cuerpo y verificación del Bearer JWT
  controller.go                  → handlers; el de rutas depende de la interfaz RouteService
  dto.go                         → estructuras de request y error
internal/service/                → interfaz RouteService + implementación que envuelve a graph
internal/graph/                  → dominio: Dijkstra + OptimalRoute (lógica pura, testeable)
internal/auth/                   → JWT HS256 (emisión y verificación, stdlib)
openapi.yaml                     → contrato OpenAPI 3 de la API
```
El grafo llega en el request (distritos = nodos, distancias = pesos), por lo que
**el grafo de Lima puede cambiar sin modificar la lógica central** (criterio de extensibilidad).

## Algoritmo
`OptimalRoute` ejecuta **un único Dijkstra** desde un nodo origen virtual conectado con
peso 0 a todas las bases, en vez de uno por base. El grafo se trata como **dirigido**
(`A → B` no implica `B → A`); los vecinos se recorren en orden alfabético para que el
resultado sea determinista.

**Regla de desempate:** a igual distancia gana la primera base del request; base en el
distrito del accidente gana siempre (distancia 0, `path: [base]`).

## Endpoints (v1)
| Método | Ruta                | Auth   | Descripción |
|--------|---------------------|--------|-------------|
| POST   | /v1/auth/token      | -      | Emite JWT con clientId/clientSecret |
| POST   | /v1/routes/optimal  | Bearer | Calcula la ruta óptima |
| GET    | /v1/health          | -      | Healthcheck |

Contrato completo (esquemas, ejemplos y códigos de error) en [openapi.yaml](openapi.yaml).

**Errores controlados:** 400 (`BAD_REQUEST`: cuerpo inválido; `VALIDATION`: campos vacíos,
sin depots, distrito del accidente inexistente, base inexistente o distancia negativa),
401 (sin token o inválido), 413 (`PAYLOAD_TOO_LARGE`: cuerpo mayor a 1 MB),
422 (`UNREACHABLE`: accidente no alcanzable desde ninguna base).

## Ejecutar
Requiere Go 1.23 o superior.
```bash
go test ./...            # 27 pruebas unitarias (dominio, auth, API y configuración)
JWT_SECRET=<secreto> CLIENT_ID=frontend CLIENT_SECRET=<secreto-cliente> go run .   # escucha en :8080
```
El servicio **no arranca** si falta `JWT_SECRET`, `CLIENT_ID` o `CLIENT_SECRET`: no hay secretos por defecto.
```bash
TOKEN=$(curl -s localhost:8080/v1/auth/token -d '{"clientId":"frontend","clientSecret":"<secreto-cliente>"}' | jq -r .accessToken)
curl -s localhost:8080/v1/routes/optimal -H "Authorization: Bearer $TOKEN" -d @ejemplo.json
```

## Docker y despliegue

En producción corre en **Render** (plan Free, runtime Docker con este `Dockerfile`): https://routes-service-68hr.onrender.com.
La configuración está en la sección [Despliegue del README raíz](../README.md#despliegue). Alternativa
equivalente en GCP Cloud Run (capa gratuita):

```bash
docker build -t routes-service .
gcloud run deploy routes-service --source . --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET=<secreto>,CLIENT_ID=<id>,CLIENT_SECRET=<secreto-cliente>
```
Render y Cloud Run inyectan `PORT` automáticamente; la imagen es distroless (mínima superficie de ataque).

## Variables de entorno
| Variable | Obligatoria | Default | Uso |
|---|---|---|---|
| `JWT_SECRET` | sí | - | Firma HS256 |
| `CLIENT_ID` / `CLIENT_SECRET` | sí | - | Credenciales para `/v1/auth/token` (se comparan en tiempo constante) |
| `PORT` | no | `8080` | Puerto HTTP (Render y Cloud Run lo inyectan) |
| `CORS_ORIGIN` | no | `*` | Orígenes permitidos, separados por coma |

## Límites del servidor
`http.Server` con `ReadHeaderTimeout` 5s, `ReadTimeout` 10s, `WriteTimeout` 10s e `IdleTimeout` 60s,
y cuerpo limitado a 1 MB con `http.MaxBytesReader`.

# endorse-service — Servicio traductor de endosos (Ejercicio 1)

API en **Node 22 + TypeScript + Hapi** que recibe el JSON plano de un endoso y lo transforma
al **JSON estructurado y ordenado** que consume el core, según **plantillas dinámicas en BD**
que varían por producto y tipo de endoso. Persistencia con **TypeORM** (SQLite por defecto,
Postgres por configuración) y seguridad con **JWT HS256**.

## Arquitectura de capas

```
src/
  routes/        → rutas versionadas /v1, validación Joi del payload, estrategia de auth por ruta
  controllers/   → reciben el request, invocan el servicio y traducen errores de dominio a HTTP
  services/      → lógica de negocio: TranslateService (traducción) y AuthService (JWT)
  entities/      → DTOs de entrada/salida (patrón DTO), esquema Joi y errores de dominio
  mappers/       → toCoreEndorsement: JSON plano + plantilla → JSON del core
  repositories/  → PlantillaRepository (interfaz) + implementación TypeORM
  models/        → modelos TypeORM (una clase por tabla del ER)
  database/      → DataSource, migraciones, seed (infraestructura, no es una capa de negocio)
  server.ts      → composition root: arma las dependencias y registra auth y rutas
  index.ts       → arranque (falla si falta configuración obligatoria)
tests/           → pruebas unitarias y de integración de cada capa
```

Flujo: `routes → controllers → services → mappers / repositories → models`.
El servicio depende de la **interfaz** `PlantillaRepository`, no de TypeORM, así que se prueba con un doble.

### Capas del PDF que se omiten

- **Integration**: no hay APIs HTTP externas en este alcance; la traducción solo lee la BD.
  Enviar el resultado al core sería el caso de uso que la justifique.
- **Publisher**: no hay brokers ni procesamiento asíncrono; la traducción es síncrona.

Se agregarían sin tocar las capas existentes: el servicio recibiría un cliente o un publisher por constructor.

## Modelo de datos

![Modelo ER](docs/er-plantillas.png)

Fuente editable: [Interseguro_Ej1_ER_Plantillas.drawio](Interseguro_Ej1_ER_Plantillas.drawio).

| Tabla | Rol | Restricciones |
|---|---|---|
| `producto` | Catálogo de productos (`codigo` = valor de `producto` en el JSON plano) | `UNIQUE(codigo)` |
| `tipo_endoso` | Catálogo de tipos (`codigo` = valor de `tipoEndoso`) | `UNIQUE(codigo)` |
| `plantilla` | Plantilla por producto + tipo, versionada y activable; `event_description` → `eventEntity.description` | `UNIQUE(producto_id, tipo_endoso_id, version)` |
| `plantilla_campo` | Define `dynamicData`: orden, etiqueta, origen (`INPUT`/`DEFAULT`), campo de entrada, default y si es requerido | `UNIQUE(plantilla_id, orden)`, `UNIQUE(plantilla_id, etiqueta)` |
| `plantilla_evento` | Define `eventAppliedEntities` y su orden | `UNIQUE(plantilla_id, order_event)` |
| `plantilla_risk_unit` | Estructura de `riskUnitEntities`; `campo_plan_entrada` → `plansEntity.description` | — |

Un test (`tests/schema.test.ts`) verifica que la migración crea exactamente estas tablas y que
los modelos TypeORM no difieren de ella.

### Reglas de traducción

1. Joi exige `policyNumber`, `producto` y `tipoEndoso`; el resto es opcional y se aceptan claves adicionales.
2. Se usa la plantilla **activa de mayor versión** para `(producto, tipoEndoso)`. Si no hay → `404 TEMPLATE_NOT_FOUND`.
3. `dynamicData` sale ordenado por `orden`. Cada valor se resuelve así:
   - `INPUT`: toma `campo_entrada` del JSON plano; si no vino, usa `valor_default`.
   - `DEFAULT`: usa siempre `valor_default`.
   - Los valores salen siempre como **string** (o `null`).
4. Si algún campo `requerido` queda sin valor → `422 MISSING_FIELDS` con **todas** las etiquetas faltantes.
5. `frecuencia`, `moneda`, `idEnvio` y el campo del plan que no vengan salen como `null`.

### Extensibilidad

Un producto o tipo de endoso nuevo son solo `INSERT`s: producto/tipo, plantilla, campos, eventos y risk units.
El seed carga, además del caso del PDF, una segunda plantilla **ficticia** (`VidaFlex` / `CambioBeneficiario`)
que se traduce sin código nuevo. Para cambiar una plantilla sin perder la anterior, se inserta una nueva
`version` activa: se usa siempre la de mayor versión.

## Endpoints (v1)

| Método | Ruta                    | Auth   | Descripción |
|--------|-------------------------|--------|-------------|
| POST   | /v1/auth/token          | —      | Emite JWT con clientId/clientSecret (mismo contrato que routes-service) |
| POST   | /v1/endorse/translate   | Bearer | Traduce el JSON plano al JSON del core |
| GET    | /v1/health              | —      | Healthcheck |

Contrato completo en [openapi.yaml](openapi.yaml). Los errores tienen la forma `{error, code, details?}`:
`400 BAD_REQUEST` / `400 VALIDATION`, `401 UNAUTHORIZED`, `404 TEMPLATE_NOT_FOUND`, `422 MISSING_FIELDS`, `500 INTERNAL`.

## Ejecutar

Requiere Node 22 o superior (≥ 22.13, mínimo de TypeORM 1.x).

```bash
npm install
cp .env.example .env      # y define JWT_SECRET, CLIENT_ID, CLIENT_SECRET
npm run seed              # aplica migraciones y carga las plantillas de ejemplo
npm test                  # 24 pruebas (mapper, servicio, API, esquema, config)
npm run build && npm start   # o `npm run dev` con ts-node
```

El servidor **no arranca** si falta `JWT_SECRET`, `CLIENT_ID` o `CLIENT_SECRET`: no hay secretos por defecto.
Las variables se leen del entorno (el `.env` es una referencia; cárgalo con tu shell o herramienta).

```bash
TOKEN=$(curl -s localhost:8080/v1/auth/token -H "Content-Type: application/json" \
  -d '{"clientId":"frontend","clientSecret":"<CLIENT_SECRET>"}' | jq -r .accessToken)
curl -s localhost:8080/v1/endorse/translate -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d @ejemplo.json
```

### Variables de entorno

| Variable | Obligatoria | Default | Uso |
|---|---|---|---|
| `JWT_SECRET` | sí | — | Firma HS256 |
| `CLIENT_ID` / `CLIENT_SECRET` | sí | — | Credenciales para `/v1/auth/token` |
| `PORT` | no | `8080` | Puerto HTTP (Cloud Run lo inyecta) |
| `CORS_ORIGIN` | no | `*` | Orígenes permitidos, separados por coma |
| `DB_TYPE` | no | `sqlite` | `sqlite` o `postgres` |
| `DB_PATH` | no | `data/endorse.sqlite` | Archivo SQLite |
| `DB_URL` | con postgres | — | `postgres://usuario:clave@host:5432/endorse` |

### Cambiar a Postgres

1. `npm install pg`
2. `DB_TYPE=postgres` y `DB_URL=postgres://...`
3. `npm run migration:run` (o `npm run seed` para cargar también los datos de ejemplo)

La migración usa la API de `Table` de TypeORM (no SQL crudo), por lo que es la misma para ambos motores.

## Docker y despliegue (GCP Cloud Run — capa gratuita)

```bash
docker build -t endorse-service .
gcloud run deploy endorse-service --source . --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET=<secreto>,CLIENT_ID=<id>,CLIENT_SECRET=<secreto-cliente>,CORS_ORIGIN=<url-frontend>
```

Imagen multi-stage `node:22-alpine`: compila TypeScript, poda dependencias de desarrollo y ejecuta
**migraciones + seed en tiempo de build**, de modo que la base SQLite de demo viaja dentro de la imagen
y el servicio funciona apenas se despliega. Corre como usuario `node` (no root).

En producción se usaría **Postgres (Cloud SQL)**: las migraciones y el seed se ejecutarían como un job
aparte, no en el build, y los secretos irían en Secret Manager (`--set-secrets`) en vez de `--set-env-vars`.

## Trade-off: el token desde el frontend

El flujo es *client credentials*: el cliente cambia `clientId`/`clientSecret` por un JWT. Si el frontend
(SPA) llama directamente a `/v1/auth/token`, el `clientSecret` queda embebido en el bundle y cualquiera
puede leerlo y obtener tokens. El JWT, en ese caso, controla *qué* se llama y *cuándo expira*, pero no
*quién* lo pide.

Alternativas, de menor a mayor esfuerzo:

1. **Aceptarlo para la demo** y restringir `CORS_ORIGIN` al dominio del frontend (mitiga, no protege).
2. **Backend-for-frontend / proxy**: un backend propio guarda el secreto, pide el token y reenvía las
   llamadas; el navegador nunca ve el secreto.
3. **Proveedor de identidad** (Identity Platform, Cognito, Auth0): el usuario se autentica y el servicio
   valida el token del proveedor en lugar de emitir el suyo.
4. **API Gateway / Cloud Endpoints** delante del servicio, validando el token del proveedor.

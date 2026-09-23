# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
# Toolchain por si better-sqlite3 no encuentra binario precompilado para musl.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev
# BD SQLite de demo dentro de la imagen: migraciones + seed en tiempo de build.
ENV DB_TYPE=sqlite DB_PATH=/app/data/endorse.sqlite
RUN node dist/database/seed.js

# --- runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DB_TYPE=sqlite DB_PATH=/app/data/endorse.sqlite
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build --chown=node:node /app/data ./data
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]

# Project Manager

PWA personal para gestionar proyectos, planificación semanal y tareas diarias desde una única fuente de datos.

## Estado

Bootstrap inicial con capa de datos en PostgreSQL + Drizzle ORM.

## Stack

- React + TypeScript + Vite
- Vite PWA
- Node.js + Fastify
- PostgreSQL 17
- Drizzle ORM + Drizzle Kit
- Postgres.js
- pnpm workspaces
- Docker Compose

## Estructura

```text
apps/
  web/                    Frontend PWA
  api/                    API REST

packages/
  database/               Esquema, cliente y migraciones Drizzle

docs/
  architecture.md
  database.md

docker/
  dev/                    Runtime de desarrollo aislado
```

## Requisitos del host

Solo se requiere:

- Docker
- Docker Compose
- Git

Node.js, pnpm y las dependencias del proyecto se ejecutan dentro del contenedor `project-manager-app-dev`.

## Desarrollo local

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up -d --build
```

Puertos externos por defecto:

- Web: http://localhost:5180
- API: http://localhost:3080
- Health: http://localhost:3080/health

Los puertos internos siguen siendo `5173` para Vite y `3000` para Fastify. PostgreSQL no publica ningún puerto al host; la API lo consume exclusivamente por la red Docker usando `db:5432`.

Los puertos externos pueden cambiarse en `.env`:

```env
WEB_HOST_PORT=5180
API_HOST_PORT=3080
```

## Healthcheck

`GET /health` comprueba tanto Fastify como una consulta real a PostgreSQL.

Respuesta esperada:

```json
{
  "ok": true,
  "service": "project-manager-api",
  "database": "up",
  "timestamp": "..."
}
```

## Logs

```bash
docker compose -f compose.dev.yaml logs -f app
```

## Ejecutar comandos pnpm

Todos los comandos pnpm se ejecutan dentro del contenedor:

```bash
docker compose -f compose.dev.yaml exec app pnpm typecheck
docker compose -f compose.dev.yaml exec app pnpm build
```

Para abrir una shell dentro del contenedor:

```bash
docker compose -f compose.dev.yaml exec app sh
```

No es necesario ejecutar un segundo `pnpm dev`: el proceso de desarrollo ya es el comando principal del contenedor.

## Base de datos

Generar una migración a partir del esquema Drizzle:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:generate
```

Aplicar migraciones pendientes:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:migrate
```

Abrir Drizzle Studio:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:studio
```

Las migraciones generadas deben quedar versionadas en Git dentro de `packages/database/drizzle/`.

## Detener el entorno

```bash
docker compose -f compose.dev.yaml down
```

Los datos de PostgreSQL y las dependencias permanecen en volúmenes Docker. Para eliminar también los volúmenes de desarrollo:

```bash
docker compose -f compose.dev.yaml down -v
```

Consulta `docs/architecture.md` para el alcance inicial y `docs/database.md` para el modelo de datos.

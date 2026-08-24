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

## Distribución en el servidor

```text
/srv/containers/
├── apps/
│   └── project-manager/          Código, frontend y API
├── databases/
│   └── project-manager/          PostgreSQL y data
└── backups/
    └── project-manager/          Respaldos de PostgreSQL
```

La aplicación y PostgreSQL son stacks Docker independientes. Se comunican exclusivamente mediante la red externa `project-manager-backend`. PostgreSQL no publica `5432` al host.

Los proyectos Compose tienen nombres distintos para mantener aislado su ciclo de vida:

- aplicación: `project-manager-app`
- base de datos: `project-manager-database`

Esto evita que `docker compose ps`, `up` o `down` de la aplicación considere a PostgreSQL como un contenedor huérfano del mismo proyecto.

## Estructura del repositorio

```text
apps/
  web/                            Frontend PWA
  api/                            API REST

packages/
  database/                       Esquema, cliente y migraciones Drizzle

docs/
  architecture.md
  database.md

docker/
  dev/                            Runtime Node/pnpm de desarrollo
  database/                       Plantilla del stack PostgreSQL separado

scripts/
  setup-dev-database.sh           Prepara la BD bajo /srv/containers/databases
```

## Requisitos del host

Solo se requiere:

- Docker
- Docker Compose
- Git
- OpenSSL

Node.js, pnpm y las dependencias del proyecto se ejecutan dentro del contenedor `project-manager-app-dev`.

## Preparar PostgreSQL

Desde `/srv/containers/apps/project-manager`:

```bash
bash scripts/setup-dev-database.sh
```

El script:

1. crea la red Docker externa `project-manager-backend` si no existe;
2. crea `/srv/containers/databases/project-manager`;
3. copia allí el `compose.yaml` de PostgreSQL;
4. crea una contraseña aleatoria si la BD todavía no tiene `.env`;
5. sincroniza `DATABASE_URL` en el `.env` de la aplicación;
6. levanta `project-manager-db-dev`.

La data se mantiene en:

```text
/srv/containers/databases/project-manager/data
```

## Levantar la aplicación

```bash
docker compose -f compose.dev.yaml up -d --build
```

Puertos externos por defecto:

- Web: http://localhost:5180
- API: http://localhost:3080
- Health: http://localhost:3080/health

Los puertos internos siguen siendo `5173` para Vite y `3000` para Fastify. La API consume PostgreSQL mediante `project-manager-db:5432` dentro de `project-manager-backend`.

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

Aplicación:

```bash
docker compose -f compose.dev.yaml logs -f app
```

Base de datos:

```bash
docker compose \
  --env-file /srv/containers/databases/project-manager/.env \
  -f /srv/containers/databases/project-manager/compose.yaml \
  logs -f db
```

## Ejecutar comandos pnpm

Todos los comandos pnpm se ejecutan dentro del contenedor de aplicación:

```bash
docker compose -f compose.dev.yaml exec app pnpm typecheck
docker compose -f compose.dev.yaml exec app pnpm build
```

Para abrir una shell dentro del contenedor:

```bash
docker compose -f compose.dev.yaml exec app sh
```

No es necesario ejecutar un segundo `pnpm dev`: el proceso de desarrollo ya es el comando principal del contenedor.

## Base de datos y migraciones

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

## Detener servicios

Aplicación:

```bash
docker compose -f compose.dev.yaml down
```

Base de datos:

```bash
docker compose \
  --env-file /srv/containers/databases/project-manager/.env \
  -f /srv/containers/databases/project-manager/compose.yaml \
  down
```

Detener la aplicación no afecta la base de datos ni sus archivos.

Consulta `docs/architecture.md` para el alcance inicial y `docs/database.md` para el modelo de datos.

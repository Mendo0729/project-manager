# Project Manager

PWA personal para gestionar proyectos, planificación semanal y tareas diarias desde una única fuente de datos.

## Estado

Bootstrap inicial del proyecto.

## Stack

- React + TypeScript + Vite
- Vite PWA
- Node.js + Fastify
- PostgreSQL
- pnpm workspaces
- Docker Compose

## Estructura

```text
apps/
  web/    Frontend PWA
  api/    API REST

docs/    Decisiones de arquitectura
```

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker + Docker Compose

## Desarrollo local

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up -d
pnpm install
pnpm dev
```

Servicios locales:

- Web: http://localhost:5173
- API: http://localhost:3000
- Health: http://localhost:3000/health
- PostgreSQL: localhost:5432 (solo loopback)

## Validación

```bash
pnpm typecheck
pnpm build
```

Consulta `docs/architecture.md` para el alcance y las decisiones iniciales.

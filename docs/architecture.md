# Arquitectura inicial

## Objetivo

Project Manager será una aplicación web instalable como PWA para organizar y monitorear tres niveles conectados de trabajo:

1. Proyectos y sus hitos.
2. Planificación semanal.
3. Planificación diaria.

La entidad de tarea será única: una tarea podrá pertenecer a un proyecto y, al mismo tiempo, estar planificada para una semana y un día específicos sin duplicar datos.

## Stack aprobado

- Frontend: React + TypeScript + Vite.
- PWA: vite-plugin-pwa.
- Backend: Node.js + Fastify.
- Base de datos: PostgreSQL 17.
- ORM: Drizzle ORM.
- Contenedores: Docker / Docker Compose.
- Producción prevista: Cloudflare + Nginx Proxy Manager.

## Separación física en el servidor

```text
/srv/containers/
├── apps/
│   └── project-manager/
├── databases/
│   └── project-manager/
└── backups/
    └── project-manager/
```

La aplicación y PostgreSQL son stacks Docker independientes. Ambos se conectan a la red externa `project-manager-backend`.

PostgreSQL no publica `5432` al host. La API lo resuelve por DNS interno mediante `project-manager-db:5432`.

## Monorepo

```text
project-manager/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── database/
├── docker/
│   ├── dev/
│   └── database/
├── scripts/
├── docs/
├── compose.dev.yaml
└── pnpm-workspace.yaml
```

## Entidades del MVP

- users
- projects
- milestones
- tasks
- task_checklists
- weekly_plans
- daily_plans
- tags
- task_tags
- project_tags
- activity_logs

## Reglas principales

- Una tarea puede existir sin proyecto.
- Una tarea puede pertenecer a un proyecto y opcionalmente a un hito.
- Una tarea puede tener una semana planificada y una fecha diaria específica.
- Las tareas canceladas no cuentan para el progreso.
- El progreso de proyecto será inicialmente automático según tareas completadas.
- La edición offline completa queda fuera del MVP; la PWA tendrá shell/cache básico primero.
- Detener o reconstruir la aplicación no debe detener ni recrear PostgreSQL.
- La data de PostgreSQL se mantiene fuera de `/srv/containers/apps`.

## Próximas fases

1. Finalizar y validar migración PostgreSQL inicial.
2. Autenticación.
3. API de proyectos e hitos.
4. Sistema universal de tareas.
5. Dashboard.
6. Vista semanal.
7. Vista diaria.
8. Estadísticas.
9. Docker de producción y backups.

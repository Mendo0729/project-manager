# Modelo de datos

## Objetivo

El modelo mantiene una única fuente de verdad para proyectos, planificación semanal y planificación diaria. Una tarea no se duplica al aparecer en varias vistas: los campos de planificación determinan dónde se muestra.

## Entidades

### users

Propietario de todos los datos. Se incluye desde el inicio aunque la primera instalación sea de un solo usuario para evitar una migración estructural futura.

### projects

Proyecto con estado, prioridad, fechas y modo de cálculo de progreso.

- `progress_mode = automatic`: el progreso se calcula a partir de tareas/hitos.
- `progress_mode = manual`: se utiliza `manual_progress` entre 0 y 100.

### milestones

Hitos de un proyecto. Tienen peso y posición para permitir posteriormente progreso ponderado y orden manual.

### tasks

Entidad universal de trabajo.

Una tarea puede tener simultáneamente:

- `project_id`: pertenencia a proyecto.
- `milestone_id`: pertenencia a hito.
- `parent_task_id`: subtarea.
- `planned_week`: semana de planificación.
- `scheduled_date`: día de ejecución.
- `due_date`: fecha límite.

Los campos de proyecto y planificación son opcionales; por eso también existen tareas independientes.

### task_checklists

Elementos simples dentro de una tarea. No sustituyen a las subtareas: una subtarea es otra tarea con ciclo de vida propio; un checklist es únicamente un ítem completado/no completado.

### weekly_plans

Una fila por usuario y semana, con objetivo principal y notas. Las tareas semanales continúan viviendo en `tasks`.

### daily_plans

Una fila por usuario y fecha, con objetivo principal y notas. Las tareas del día continúan viviendo en `tasks`.

### tags

Etiquetas definidas por usuario.

### task_tags / project_tags

Relaciones muchos-a-muchos de etiquetas con tareas y proyectos.

### activity_logs

Historial de cambios relevante para estadísticas y auditoría funcional. `metadata` usa JSONB para almacenar contexto específico de la actividad sin multiplicar columnas.

## Estados

### Proyecto

- `planned`
- `active`
- `paused`
- `completed`
- `archived`

### Hito

- `planned`
- `active`
- `completed`
- `canceled`

### Tarea

- `backlog`
- `pending`
- `in_progress`
- `blocked`
- `completed`
- `canceled`

### Prioridad

- `low`
- `medium`
- `high`
- `critical`

## Integridad

El esquema incluye:

- claves UUID generadas por PostgreSQL;
- claves foráneas con reglas de borrado explícitas;
- índices para estado, proyecto y fechas de planificación;
- unicidad de email, etiquetas, plan semanal y plan diario;
- `CHECK` para porcentajes, pesos, posiciones y minutos;
- fechas de proyecto coherentes (`target_date >= start_date`).

## Migraciones

Las migraciones son generadas por Drizzle Kit y deben permanecer versionadas en `packages/database/drizzle/`.

Desde el contenedor de desarrollo:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:generate
docker compose -f compose.dev.yaml exec app pnpm db:migrate
```

Para inspeccionar la base con Drizzle Studio:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:studio
```

No se utiliza `db:push` como procedimiento normal de desarrollo. Los cambios estructurales deben quedar representados por una migración versionada.

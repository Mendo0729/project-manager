# Fase 4 — Hitos

## Objetivo

Implementar hitos dentro de cada proyecto, con aislamiento estricto por usuario autenticado y preparación del progreso automático del proyecto.

## Alcance

- Crear, listar, consultar y editar hitos.
- Estados: `planned`, `active`, `completed`, `canceled`.
- Peso positivo por hito.
- Fecha objetivo.
- Orden por `position`.
- Reordenamiento seguro de hitos.
- Completar, reabrir y cancelar.
- Activity logs de cambios relevantes.
- Integración de hitos en el detalle del proyecto.
- Progreso automático del proyecto calculado a partir de hitos ponderados.
- Aislamiento multiusuario mediante la propiedad del proyecto.

## API prevista

- `GET /projects/:projectId/milestones`
- `POST /projects/:projectId/milestones`
- `GET /projects/:projectId/milestones/:milestoneId`
- `PATCH /projects/:projectId/milestones/:milestoneId`
- `PUT /projects/:projectId/milestones/order`

No se implementará borrado físico en esta fase.

## Reglas de seguridad

- El cliente no envía ni decide `user_id`.
- El ownership del hito se resuelve mediante `milestone.project_id -> project.user_id`.
- Cualquier acceso a un proyecto o hito ajeno responde `404`.
- El reordenamiento debe ser atómico y rechazar IDs externos o de otros proyectos.

## Progreso automático

Durante esta fase:

- `completed` aporta 100%.
- `planned` y `active` aportan 0%.
- `canceled` queda fuera del denominador.
- El cálculo se pondera por `weight`.
- Si no existen hitos válidos, el progreso automático es 0%.
- Si el proyecto usa progreso manual, los hitos no alteran su porcentaje.

En Fase 5 el progreso de cada hito podrá evolucionar según sus tareas.

## Activity logs

- `milestone.created`
- `milestone.updated`
- `milestone.status_changed`
- `milestone.completed`
- `milestone.reopened`
- `milestone.canceled`
- `milestone.reordered`

## Frontend previsto

- Integración en `/projects/:projectId`.
- `/projects/:projectId/milestones/new`.
- `/projects/:projectId/milestones/:milestoneId`.
- `/projects/:projectId/milestones/:milestoneId/edit`.
- UI provisional; el rediseño definitivo queda fuera de alcance.

## Fuera de alcance

- Tareas y subtareas.
- Checklists.
- Dependencias entre hitos.
- Gantt.
- Drag & drop sofisticado.
- Planificación semanal o diaria.
- Notificaciones.
- Colaboración entre usuarios.
- Roles.
- Rediseño visual definitivo.

## Criterios de cierre

- Crear/listar/ver/editar hitos.
- Estados y transiciones correctas.
- Completar/reabrir/cancelar.
- Peso y fecha objetivo.
- Orden y reordenamiento.
- Activity logs.
- Progreso automático del proyecto.
- Integración frontend.
- Aislamiento entre usuarios y `404` para IDs ajenos.
- `pnpm typecheck` OK dentro de Docker.
- `pnpm build` OK dentro de Docker.
- Validación funcional con dos cuentas.

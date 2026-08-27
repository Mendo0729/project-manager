# Fase 5 — Tareas, subtareas y checklists

## Objetivo

Implementar el núcleo de trabajo ejecutable de Project Manager conectando tareas personales, tareas de proyecto y tareas de hito, con subtareas, checklists, etiquetas básicas y progreso automático derivado.

## Modelo funcional

```text
Usuario
├── Tareas personales
└── Proyectos
    └── Hitos
        └── Tareas
            ├── Subtareas
            └── Checklist
```

## Alcance

### Tareas

- tareas personales sin proyecto ni hito.
- tareas asociadas a proyecto.
- tareas asociadas a hito.
- estados `backlog`, `pending`, `in_progress`, `blocked`, `completed`, `canceled`.
- prioridades `low`, `medium`, `high`, `critical`.
- descripción, fecha límite, tiempo estimado, peso y posición.
- completar, reabrir, bloquear y cancelar.
- sin borrado físico de tareas en esta fase.

### Subtareas

- usar `parent_task_id`.
- máximo un nivel de subtareas en el MVP.
- la subtarea hereda `user_id`, `project_id` y `milestone_id` de la tarea padre.
- las subtareas no cuentan directamente en el progreso ponderado del hito para evitar doble conteo.

### Checklists

- crear, actualizar, completar/reabrir, eliminar y reordenar elementos.
- cada elemento pertenece a una tarea.
- progreso visual de checklist basado en elementos completados.

### Etiquetas

- crear/listar etiquetas del usuario.
- asignar y quitar etiquetas en tareas.
- sin gestor avanzado de etiquetas en esta fase.

## Seguridad y ownership

- el cliente nunca decide `user_id`.
- toda tarea se filtra por el usuario autenticado.
- cualquier proyecto, hito, tarea, subtarea, checklist o etiqueta ajena debe responder `404` cuando aplique.
- una tarea asignada a un hito debe pertenecer al mismo proyecto que ese hito.
- una subtarea hereda el contexto de la tarea padre y no puede cambiarlo manualmente.

## API prevista

### Tareas globales

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/:taskId`
- `PATCH /tasks/:taskId`
- `PUT /tasks/order`

### Contexto proyecto/hito

- `GET /projects/:projectId/tasks`
- `POST /projects/:projectId/tasks`
- `GET /projects/:projectId/milestones/:milestoneId/tasks`
- `POST /projects/:projectId/milestones/:milestoneId/tasks`

### Subtareas

- `POST /tasks/:taskId/subtasks`

### Checklist

- `GET /tasks/:taskId/checklist`
- `POST /tasks/:taskId/checklist`
- `PATCH /tasks/:taskId/checklist/:itemId`
- `DELETE /tasks/:taskId/checklist/:itemId`
- `PUT /tasks/:taskId/checklist/order`

### Tags

- listar/crear tags del usuario.
- asignar/quitar tags a tareas.

## Progreso

### Tarea

- sin subtareas/checklist: `completed = 100%`, resto `0%`.
- con checklist: progreso informativo por items completados.
- con subtareas: progreso informativo por subtareas completadas.
- el estado de la tarea padre no cambia automáticamente por progreso interno.

### Hito

- `completed` continúa mostrando `100%`.
- en caso contrario, el progreso se calcula con tareas principales (`parent_task_id IS NULL`) no canceladas y ponderadas por `weight`.
- las tareas `canceled` se excluyen del denominador.

### Proyecto

- mantiene el cálculo ponderado por hitos implementado en Fase 4.
- al cambiar el progreso del hito por tareas, el proyecto refleja ese progreso automáticamente.
- proyectos con `progress_mode = manual` no cambian por hitos ni tareas.

## Activity logs

Registrar como mínimo:

- `task.created`
- `task.updated`
- `task.status_changed`
- `task.completed`
- `task.reopened`
- `task.canceled`
- `task.reordered`
- `subtask.created`
- `subtask.updated`
- `checklist.created`
- `checklist.completed`
- `checklist.reopened`
- `checklist.reordered`
- `task.tag_added`
- `task.tag_removed`

## Frontend

- habilitar `/tasks` en la navegación principal.
- vista global con búsqueda y filtros por estado, proyecto, prioridad y fecha.
- ruta `/tasks/:taskId` para detalle.
- formularios de creación/edición.
- integrar tareas en detalle de proyecto.
- integrar tareas en detalle de hito.
- mantener el sistema visual sobrio, modo oscuro y responsive implementados en Fase 4.

## Fuera de alcance

- planificación semanal.
- planificación diaria.
- calendario.
- recordatorios y notificaciones.
- recurrencia.
- dependencias entre tareas.
- archivos adjuntos.
- comentarios.
- colaboración y roles.
- asignación a otros usuarios.
- temporizador en tiempo real.
- Kanban/drag & drop avanzado.

## Orden de implementación

1. Schemas compartidos de tareas.
2. Repository y ownership.
3. CRUD lógico y estados.
4. Activity logs.
5. Tareas por proyecto/hito.
6. Subtareas.
7. Checklists.
8. Reordenamiento.
9. Tags básicos.
10. Progreso de hitos basado en tareas.
11. Propagación de progreso a proyectos.
12. Vista global `/tasks`.
13. Integración en Project Detail.
14. Integración en Milestone Detail.
15. Task Detail / Form.
16. Validación multiusuario.
17. `pnpm typecheck` dentro de Docker.
18. `pnpm build` dentro de Docker.
19. Validación funcional y merge.

## Criterio de cierre

La fase se considerará completa cuando se valide:

- tareas personales, de proyecto y de hito.
- crear, editar y cambiar estados.
- prioridades, fecha límite, tiempo estimado y peso.
- subtareas de un nivel.
- checklists.
- reordenamiento persistente.
- tags básicos.
- activity logs.
- aislamiento multiusuario y `404` para IDs ajenos.
- progreso de hito calculado por tareas principales.
- progreso de proyecto actualizado por hitos.
- vista global de tareas.
- integración proyecto/hito.
- responsive y dark mode.
- `pnpm typecheck` OK.
- `pnpm build` OK.

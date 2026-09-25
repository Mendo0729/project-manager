# Fase 5.12 — cierre y validación del sistema de tareas

Validación realizada el 25 de septiembre de 2026 en la rama `agent/tasks`.

## Comprobaciones automatizadas

- `pnpm typecheck`: correcto en API, web y paquetes compartidos.
- `pnpm build`: correcto; la PWA genera el service worker y seis entradas precargadas, todas de la aplicación estática.
- `pnpm test`: tres pruebas correctas. La prueba de aislamiento usa dos usuarios, sesiones y recursos distintos dentro de una transacción que se revierte al terminar.
- `/health`: HTTP 200 con `database: "up"` en el entorno de desarrollo.

La matriz de aislamiento cubre `GET`, `POST`, `PATCH`, `PUT` y `DELETE` en las rutas disponibles de proyectos, hitos, tareas, subtareas, checklist, etiquetas y reordenamientos. Comprueba `404` tanto para rutas de recursos ajenos como para IDs ajenos mezclados con rutas propias. También comprueba que los registros ajenos y el historial de actividad no cambian, que los listados excluyen los datos del otro usuario, que los reordenamientos propios funcionan y que una lista propia incompleta recibe `400`.

## Ajustes de seguridad realizados

- El filtro `parentTaskId` verifica ahora que la tarea padre pertenece al usuario autenticado y que coincide con el contexto solicitado.
- Un ID ajeno en el reordenamiento de hitos o subtareas devuelve `404`; una lista incompleta de IDs propios conserva `400`.
- Las rutas privadas devuelven `Cache-Control: no-store`, incluidas las respuestas `401`.
- Las solicitudes mutantes con `Sec-Fetch-Site` distinto de `same-origin` o `none` se rechazan. Si el navegador no envía esa cabecera pero sí `Origin`, se compara el host con el de la solicitud. El proxy de desarrollo conserva la señal `same-origin` del navegador para `/api`.

## Revisión estática de web y PWA

- Las vistas usan rutas protegidas y el estado de usuario se limpia después de `logout`.
- No se usa `dangerouslySetInnerHTML` ni `innerHTML` en el frontend.
- Los estilos incluyen modo oscuro y reglas para anchos de pantalla menores. El layout aplica la preferencia de tema guardada al montar y limpia la clase al salir.
- El service worker generado precarga archivos estáticos; no contiene una regla de cache para `/api`.

## Pendiente antes del merge a `main`

- Comprobación visual y funcional en navegador de responsive y modo oscuro.
- Probar logout y posterior login de otro usuario en el mismo navegador con la PWA instalada, incluida la navegación sin conexión.
- Revisar CSRF en el despliegue productivo con su proxy y dominio reales. El control de origen añadido cubre navegadores que envían `Sec-Fetch-Site` u `Origin`; las solicitudes sin ambas cabeceras siguen admitidas para clientes no navegador.

El intento de captura automática con Firefox headless del servidor no produjo una imagen: la instalación Snap no pudo abrir un perfil de prueba aislado. Por ello, la validación visual sigue pendiente.

Hasta completar esas verificaciones, el merge de la Fase 5 queda pendiente.

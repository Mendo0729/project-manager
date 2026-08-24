# Estructura del proyecto

La organización del repositorio sigue dominios funcionales y responsabilidades claras para evitar carpetas planas a medida que crezca la aplicación.

## Estructura base

```text
apps/
├── api/
│   └── src/
│       ├── config/
│       ├── common/
│       │   ├── errors/
│       │   ├── http/
│       │   └── utils/
│       ├── plugins/
│       └── modules/
│           ├── auth/
│           ├── users/
│           ├── projects/
│           ├── milestones/
│           ├── tasks/
│           ├── planning/
│           ├── tags/
│           └── activity/
│
└── web/
    └── src/
        ├── app/
        ├── components/
        │   ├── layout/
        │   └── ui/
        ├── features/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── projects/
        │   ├── tasks/
        │   ├── planning/
        │   └── settings/
        ├── hooks/
        ├── lib/
        ├── services/
        └── types/

packages/
├── database/
├── schemas/
└── shared/

tests/
├── integration/
└── e2e/
```

## Criterios

- `apps/api/src/modules`: cada dominio de negocio concentra rutas, servicios y lógica propia.
- `apps/api/src/common`: utilidades transversales que no pertenecen a un dominio.
- `apps/api/src/plugins`: integración de Fastify con servicios compartidos.
- `apps/web/src/features`: UI, hooks y estado específicos de cada función.
- `apps/web/src/components/ui`: componentes visuales reutilizables y sin lógica de negocio.
- `apps/web/src/components/layout`: shell, navegación y composición global.
- `packages/database`: esquema Drizzle, cliente y migraciones.
- `packages/schemas`: contratos y validaciones compartidas entre API y frontend.
- `packages/shared`: tipos y utilidades independientes del framework.
- `tests/integration`: pruebas de API y persistencia.
- `tests/e2e`: flujos completos desde la interfaz.

Los directorios vacíos se conservan inicialmente con `.gitkeep` y se reemplazarán por archivos reales conforme avance cada módulo.

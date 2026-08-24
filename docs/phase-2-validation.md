# Fase 2 - Validación local

La rama de autenticación se valida dentro del contenedor de desarrollo.

## 1. Instalar dependencias

```bash
docker compose -f compose.dev.yaml exec app pnpm install
```

## 2. Validar TypeScript y build

```bash
docker compose -f compose.dev.yaml exec app pnpm typecheck
docker compose -f compose.dev.yaml exec app pnpm build
```

## 3. Generar migración de sesiones

```bash
docker compose -f compose.dev.yaml exec app pnpm db:generate
```

La migración nueva debe crear `sessions` y sus índices/FK. Debe revisarse antes de aplicarla.

## 4. Aplicar migración

Después de revisar el SQL:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:migrate
```

## 5. Crear usuario inicial

Usar variables temporales en la misma shell:

```bash
export INITIAL_USER_EMAIL='usuario@example.com'
export INITIAL_USER_NAME='Nombre'
export INITIAL_USER_PASSWORD='una-contraseña-segura'

docker compose -f compose.dev.yaml exec \
  -e INITIAL_USER_EMAIL \
  -e INITIAL_USER_NAME \
  -e INITIAL_USER_PASSWORD \
  app pnpm auth:create-user

unset INITIAL_USER_EMAIL INITIAL_USER_NAME INITIAL_USER_PASSWORD
```

El comando debe fallar si ya existe un usuario.

## 6. Probar API

```bash
curl -i -c /tmp/project-manager.cookies \
  -H 'Content-Type: application/json' \
  -d '{"email":"usuario@example.com","password":"una-contraseña-segura"}' \
  http://127.0.0.1:3080/auth/login

curl -i -b /tmp/project-manager.cookies \
  http://127.0.0.1:3080/auth/me

curl -i -b /tmp/project-manager.cookies \
  -X POST http://127.0.0.1:3080/auth/logout
```

Después del logout, `/auth/me` debe responder `401` usando la misma cookie.

# Autenticación

## Modelo

Project Manager utiliza sesiones server-side.

- La contraseña se almacena con Argon2id.
- El navegador recibe un token de sesión aleatorio de 256 bits.
- La cookie es `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- PostgreSQL guarda únicamente SHA-256 del token de sesión.
- Las sesiones expiran a los 30 días y pueden revocarse desde el servidor.
- No existe registro público en el MVP.

## Usuario inicial

El primer usuario se crea exclusivamente mediante CLI. El comando se niega a crear otro usuario si la tabla `users` ya contiene uno.

Desde el host, usando el contenedor de desarrollo:

```bash
INITIAL_USER_EMAIL='usuario@example.com' \
INITIAL_USER_NAME='Nombre' \
INITIAL_USER_PASSWORD='una-contraseña-segura' \
docker compose -f compose.dev.yaml exec -e INITIAL_USER_EMAIL -e INITIAL_USER_NAME -e INITIAL_USER_PASSWORD app pnpm auth:create-user
```

También se puede abrir una shell dentro del contenedor y exportar las variables temporalmente. No deben versionarse credenciales en `.env` ni en Git.

## API

### `POST /auth/login`

Body:

```json
{
  "email": "usuario@example.com",
  "password": "..."
}
```

Crea una sesión y responde con el usuario autenticado.

### `GET /auth/me`

Devuelve el usuario asociado a la cookie de sesión actual. Responde `401` cuando la sesión no existe o expiró.

### `POST /auth/logout`

Revoca la sesión actual en PostgreSQL y elimina la cookie.

## Desarrollo web

La PWA usa `/api/auth/*`. Vite redirige `/api` a Fastify dentro del mismo contenedor y elimina el prefijo antes de llegar a la API. De esta forma el navegador trabaja same-origin y no requiere CORS en desarrollo.

## Flujo de migración

Después de modificar el esquema de sesiones:

```bash
docker compose -f compose.dev.yaml exec app pnpm db:generate
docker compose -f compose.dev.yaml exec app pnpm db:migrate
```

La migración generada debe quedar versionada en `packages/database/drizzle/`.

# Autenticación

## Modelo

Project Manager utiliza sesiones server-side.

- La contraseña se almacena con Argon2id.
- El navegador recibe un token de sesión aleatorio de 256 bits.
- La cookie es `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- PostgreSQL guarda únicamente SHA-256 del token de sesión.
- Las sesiones expiran a los 30 días y pueden revocarse desde el servidor.
- Los usuarios pueden crear su propia cuenta desde `/register`.
- No existen roles en el modelo actual: cada cuenta administra únicamente su propio espacio.

## Aislamiento entre usuarios

Todas las entidades personales (`projects`, `tasks`, `weekly_plans`, `daily_plans`, `tags`, etc.) están asociadas a un `user_id`.

Regla de implementación obligatoria para los endpoints funcionales:

- el cliente nunca decide qué `user_id` utilizar;
- el API obtiene el usuario exclusivamente desde la sesión autenticada;
- las consultas y mutaciones se filtran por el `user_id` de esa sesión;
- un usuario no puede listar, consultar, modificar ni eliminar datos pertenecientes a otra cuenta.

Esto permite que varias personas utilicen la misma aplicación manteniendo sus espacios completamente separados.

## Creación de cuentas

### Desde la aplicación

La pantalla `/register` permite crear una cuenta con nombre, correo y contraseña. Al completar el registro correctamente se crea también una sesión y el usuario entra directamente a su espacio.

### Usuario inicial mediante CLI

El comando de bootstrap se mantiene únicamente como mecanismo de instalación para crear el primer usuario de una instancia vacía. Se niega a crear otro usuario si la tabla `users` ya contiene uno.

Desde el host, usando el contenedor de desarrollo:

```bash
INITIAL_USER_EMAIL='usuario@example.com' \
INITIAL_USER_NAME='Nombre' \
INITIAL_USER_PASSWORD='una-contraseña-segura' \
docker compose -f compose.dev.yaml exec -e INITIAL_USER_EMAIL -e INITIAL_USER_NAME -e INITIAL_USER_PASSWORD app pnpm auth:create-user
```

No deben versionarse credenciales en `.env` ni en Git.

## API

### `POST /auth/register`

Body:

```json
{
  "displayName": "Nombre",
  "email": "usuario@example.com",
  "password": "..."
}
```

Crea una cuenta nueva y una sesión inicial. Responde `409` si el correo ya está registrado.

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

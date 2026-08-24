#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
CONTAINERS_ROOT="${CONTAINERS_ROOT:-/srv/containers}"
DB_DIR="${CONTAINERS_ROOT}/databases/project-manager"
NETWORK_NAME="project-manager-backend"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker no está disponible en el host." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl no está disponible en el host." >&2
  exit 1
fi

if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  docker network create "${NETWORK_NAME}" >/dev/null
  echo "Red Docker creada: ${NETWORK_NAME}"
else
  echo "Red Docker existente: ${NETWORK_NAME}"
fi

mkdir -p "${DB_DIR}/data"
cp "${REPO_ROOT}/docker/database/compose.yaml" "${DB_DIR}/compose.yaml"

if [[ ! -f "${DB_DIR}/.env" ]]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  cat > "${DB_DIR}/.env" <<EOF
POSTGRES_DB=project_manager
POSTGRES_USER=project_manager
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOF
  chmod 600 "${DB_DIR}/.env"
  echo "Configuración de PostgreSQL creada en ${DB_DIR}/.env"
else
  POSTGRES_PASSWORD="$(grep '^POSTGRES_PASSWORD=' "${DB_DIR}/.env" | cut -d= -f2-)"
  if [[ -z "${POSTGRES_PASSWORD}" ]]; then
    echo "ERROR: ${DB_DIR}/.env no contiene POSTGRES_PASSWORD." >&2
    exit 1
  fi
  echo "Configuración existente preservada: ${DB_DIR}/.env"
fi

POSTGRES_DB="$(grep '^POSTGRES_DB=' "${DB_DIR}/.env" | cut -d= -f2-)"
POSTGRES_USER="$(grep '^POSTGRES_USER=' "${DB_DIR}/.env" | cut -d= -f2-)"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@project-manager-db:5432/${POSTGRES_DB}"
APP_ENV="${REPO_ROOT}/.env"

if [[ ! -f "${APP_ENV}" ]]; then
  cat > "${APP_ENV}" <<EOF
WEB_HOST_PORT=5180
API_HOST_PORT=3080
DATABASE_URL=${DATABASE_URL}
EOF
else
  if grep -q '^DATABASE_URL=' "${APP_ENV}"; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "${APP_ENV}"
  else
    printf '\nDATABASE_URL=%s\n' "${DATABASE_URL}" >> "${APP_ENV}"
  fi
fi

chmod 600 "${APP_ENV}"

docker compose \
  --env-file "${DB_DIR}/.env" \
  -f "${DB_DIR}/compose.yaml" \
  up -d

echo
echo "Base de datos de desarrollo preparada."
echo "Directorio: ${DB_DIR}"
echo "Contenedor: project-manager-db-dev"
echo "Red: ${NETWORK_NAME}"
echo "PostgreSQL no publica puertos al host."

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="echelon"
PORT="1947"
BIND_ADDRESS="127.0.0.1"

# ── Helpers ──────────────────────────────────────────────────────────────────

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
info()  { printf '\033[1;34m→ %s\033[0m\n' "$*"; }

die() { red "ERROR: $*" >&2; exit 1; }

# ── Argument parsing ─────────────────────────────────────────────────────────

INSTANCE_NAME=""
VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) INSTANCE_NAME="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--name NAME] [<version>]"
      echo ""
      echo "Roll back to a previous Echelon Analytics Docker image."
      echo ""
      echo "Options:"
      echo "  --name NAME    Instance name (for multi-instance deploys)"
      echo "  <version>      Tag to roll back to (e.g. v26-03-01)"
      echo ""
      echo "With no arguments, lists available versions."
      exit 0
      ;;
    *) VERSION="$1"; shift ;;
  esac
done

# ── Resolve instance name (CLI flag → .env → default) ───────────────────────

if [[ -z "$INSTANCE_NAME" && -f .env ]]; then
  env_name=$(grep -E '^INSTANCE_NAME=' .env | cut -d= -f2 | tr -d '[:space:]' || true)
  [[ -n "$env_name" ]] && INSTANCE_NAME="$env_name"
fi

# ── Validate instance name ───────────────────────────────────────────────────

if [[ -n "$INSTANCE_NAME" ]]; then
  if ! [[ "$INSTANCE_NAME" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
    die "--name must be lowercase alphanumeric with optional hyphens (e.g. trippi, my-site)"
  fi
  if [[ "$INSTANCE_NAME" =~ ^(v[0-9]|dev(-|$)|smoke(-|$)) ]]; then
    die "--name must not start with v<digit>, dev, or smoke (reserved prefixes)"
  fi
fi

# ── Compute instance-scoped paths ────────────────────────────────────────────

if [[ -n "$INSTANCE_NAME" ]]; then
  CONTAINER_PREFIX="echelon-${INSTANCE_NAME}"
  DATA_DIR="data-${INSTANCE_NAME}"
  ENV_FILE=".env.${INSTANCE_NAME}"
  # Container stop filter: only match this named instance's containers
  STOP_FILTER="^echelon-${INSTANCE_NAME}-"
else
  CONTAINER_PREFIX="echelon"
  DATA_DIR="data"
  ENV_FILE=".env"
  # Container stop filter: match default instance only (tagged or dev), not named instances
  STOP_FILTER="^echelon-(v|dev-)"
fi

# ── Load env vars ────────────────────────────────────────────────────────────

if [[ -n "$INSTANCE_NAME" && ! -f "$ENV_FILE" ]]; then
  info "Instance env file $ENV_FILE not found, falling back to .env"
  ENV_FILE=".env"
fi

if [[ -f "$ENV_FILE" ]]; then
  val=$(grep -E '^BIND_ADDRESS=' "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]' || true)
  [[ -n "$val" ]] && BIND_ADDRESS="$val"
  val=$(grep -E '^ECHELON_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]' || true)
  [[ -n "$val" ]] && PORT="$val"
fi

# ── List available versions ──────────────────────────────────────────────────

list_versions() {
  echo "Available $IMAGE versions:"
  echo ""
  docker images "$IMAGE" --format 'table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}' \
    | grep -v '<none>' \
    | grep -v 'latest'
  echo ""

  OLD=$(docker ps -q -f "name=${STOP_FILTER}" | head -1)
  if [[ -n "$OLD" ]]; then
    OLD_NAME=$(docker inspect --format '{{.Name}}' "$OLD" | sed 's|^/||')
    echo "Currently running: $OLD_NAME"
  else
    echo "No $CONTAINER_PREFIX container is currently running."
  fi
}

# ── No version: list and exit ────────────────────────────────────────────────

if [[ -z "$VERSION" ]]; then
  list_versions
  echo ""
  echo "Usage: $0 [--name NAME] <version>  (e.g. $0 v26-03-01)"
  exit 0
fi

# ── Rollback to specified version ────────────────────────────────────────────

[[ "$VERSION" != v* ]] && VERSION="v$VERSION"
CONTAINER="${CONTAINER_PREFIX}-${VERSION}"

if ! docker image inspect "$IMAGE:$VERSION" >/dev/null 2>&1; then
  die "Image $IMAGE:$VERSION not found. Run '$0' with no arguments to list available versions."
fi

if docker ps -q -f "name=^${CONTAINER}$" | grep -q .; then
  die "Already running $CONTAINER"
fi

info "Rolling back to $IMAGE:$VERSION"

OLD=$(docker ps -q -f "name=${STOP_FILTER}" | head -1)
if [[ -n "$OLD" ]]; then
  OLD_NAME=$(docker inspect --format '{{.Name}}' "$OLD" | sed 's|^/||')
  info "Stopping $OLD_NAME (30s grace period)"
  docker stop --time=30 "$OLD" >/dev/null
  docker rm "$OLD" >/dev/null
fi

# Load env vars from env file (handles values containing =)
ENV_ARGS=()
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "${line// /}" || "$line" == \#* ]] && continue
    [[ "$line" != *"="* ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    value="${value%\"}" ; value="${value#\"}"
    value="${value%\'}" ; value="${value#\'}"
    ENV_ARGS+=(-e "$key=$value")
  done < "$ENV_FILE"
fi

info "Starting $CONTAINER"
docker run -d \
  --name "$CONTAINER" \
  -p "${BIND_ADDRESS}:${PORT}:${PORT}" \
  -v "$(pwd)/${DATA_DIR}:/app/data" \
  -e "VERSION=$VERSION" \
  --add-host=host.docker.internal:host-gateway \
  "${ENV_ARGS[@]+"${ENV_ARGS[@]}"}" \
  --restart unless-stopped \
  "$IMAGE:$VERSION" >/dev/null

# Health check
info "Waiting for health check"
passed=false
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    passed=true
    break
  fi
  sleep 1
done

if [[ "$passed" == "true" ]]; then
  green "Rollback to $CONTAINER complete — health check passed"
else
  red "WARNING: Health check did not pass within 15s"
  red "Container logs:"
  docker logs "$CONTAINER" --tail 20
fi

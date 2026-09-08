#!/usr/bin/env bash
set -Eeuo pipefail

deploy_root="${1:-}"
target_image="${2:-}"
canonical_branch="design/localkarar-18"

if [[ -z "$deploy_root" || "$deploy_root" != /* ]]; then
  echo "DEPLOY_PATH must be an absolute path" >&2
  exit 2
fi
if [[ ! "$target_image" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+:[0-9a-f]{40}$ ]]; then
  echo "Target image must use an immutable full-SHA GHCR tag" >&2
  exit 2
fi

cd "$deploy_root"

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$canonical_branch" ]]; then
  echo "Refusing deployment from $current_branch; expected $canonical_branch" >&2
  exit 3
fi

# Fast-forward only: local server changes are never overwritten by automation.
git fetch origin "$canonical_branch"
git merge --ff-only FETCH_HEAD

compose=(docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml)
previous_image=""
server_running="false"
if docker inspect localakademi-server >/dev/null 2>&1; then
  previous_image="$(docker inspect --format '{{.Config.Image}}' localakademi-server)"
  server_running="$(docker inspect --format '{{.State.Running}}' localakademi-server)"
fi

# Existing production data must be backed up before migrations run.
if [[ "$server_running" == "true" ]]; then
  "${compose[@]}" exec -T server npm run ops:backup
else
  echo "No running server container; treating this as an initial deployment"
fi

export LOCALKARAR_IMAGE="$target_image"
"${compose[@]}" pull server
"${compose[@]}" up -d --no-build server

healthy="false"
for _ in {1..24}; do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/health >/dev/null; then
    healthy="true"
    break
  fi
  sleep 5
done

if [[ "$healthy" == "true" ]]; then
  echo "Production health check passed for $target_image"
  exit 0
fi

echo "Production health check failed" >&2
"${compose[@]}" logs --no-color --tail=120 server >&2 || true

if [[ -n "$previous_image" ]]; then
  echo "Rolling back to $previous_image" >&2
  export LOCALKARAR_IMAGE="$previous_image"
  "${compose[@]}" up -d --no-build server
fi
exit 1

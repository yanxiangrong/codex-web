# Deployment

Production builds are served by Fastify on `127.0.0.1:3001`. For remote use, place Caddy, nginx, or Traefik in front with HTTPS and authentication, and restrict access to trusted users. Do not expose app-server, mount `CODEX_HOME` into a web root, or bind publicly without an access-control layer.

Environment variables:

- `CODEX_BIN`: server-controlled absolute Codex executable path
- `HOST`: listen address; defaults to `127.0.0.1`
- `PORT`: HTTP port; defaults to `3001`
- `LOG_LEVEL`: structured container log level; defaults to `info`

## Docker without cloning the repository

The public image bundles the tested Codex CLI. Runtime state is never baked into the image: the host's Codex home is mounted at `/home/codex/.codex`, and the selected project directory is mounted at `/workspace`.

Create or choose the project directory that Codex may access, change into it, and start the container:

```bash
mkdir -p "$HOME/codex-workspace"
cd "$HOME/codex-workspace"

docker run -d \
  --name codex-web \
  --restart unless-stopped \
  --init \
  --security-opt no-new-privileges:true \
  -e PUID="$(id -u)" \
  -e PGID="$(id -g)" \
  -p 127.0.0.1:3001:3001 \
  -v "$HOME/.codex:/home/codex/.codex" \
  -v "$(pwd):/workspace" \
  ghcr.io/yanxiangrong/codex-web:latest
```

Open `http://127.0.0.1:3001`. View status and logs with:

```bash
docker ps --filter name=codex-web
docker logs -f codex-web
```

## Standalone Docker Compose (no clone required)

Create an empty deployment directory and save the following as `compose.yaml`:

```yaml
services:
  codex-web:
    image: ghcr.io/yanxiangrong/codex-web:latest
    container_name: codex-web
    restart: unless-stopped
    init: true
    environment:
      PUID: ${PUID:-1000}
      PGID: ${PGID:-1000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "127.0.0.1:${CODEX_WEB_PORT:-3001}:3001"
    volumes:
      - ${CODEX_HOME:-${HOME}/.codex}:/home/codex/.codex
      - ${WORKSPACE_DIR:-./workspace}:/workspace
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "curl", "--fail", "--silent", "http://127.0.0.1:3001/api/health"]
      interval: 15s
      timeout: 3s
      retries: 4
      start_period: 10s
```

Then create the workspace and start it:

```bash
mkdir -p workspace
export PUID="$(id -u)"
export PGID="$(id -g)"
docker compose up -d
docker compose ps
docker compose logs -f codex-web
```

Set `CODEX_HOME` and `WORKSPACE_DIR` to absolute host paths when deploying outside this simple layout. The entrypoint adjusts the container user to `PUID`/`PGID`, then drops root privileges before starting Codex Web.

## Upgrade and removal

For `docker run` deployments:

```bash
docker pull ghcr.io/yanxiangrong/codex-web:latest
docker rm -f codex-web
# Run the same docker run command again.
```

For Compose deployments:

```bash
docker compose pull
docker compose up -d
```

To stop Compose without deleting mounted Codex data or workspace files:

```bash
docker compose down
```

Pin a version tag instead of `latest` when reproducibility matters.

## Security and remote access

For remote access, keep the application port private and proxy it through an authenticated HTTPS endpoint. Compose deliberately does not mount `docker.sock`.

Images are published to GHCR from `main` and version tags for both amd64 and arm64.

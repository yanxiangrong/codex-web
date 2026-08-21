# Deployment

Production builds are served by Fastify on `127.0.0.1:3001`. For remote use, place Caddy, nginx, or Traefik in front with HTTPS and authentication, and restrict access to trusted users. Do not expose app-server, mount `CODEX_HOME` into a web root, or bind publicly without an access-control layer.

Environment variables:

- `CODEX_BIN`: server-controlled absolute Codex executable path
- `HOST`: listen address; defaults to `127.0.0.1`
- `PORT`: HTTP port; defaults to `3001`
- `LOG_LEVEL`: reserved structured-log level

## Docker and Compose

The image bundles the Codex CLI version recorded in `TESTED_CODEX_VERSION`. Runtime state is never baked into the image. Compose bind-mounts the host's Codex home at `/home/codex/.codex` and the selected project directory at `/workspace`.

```bash
cp .env.example .env
id -u  # use as PUID
id -g  # use as PGID
docker compose up -d
docker compose logs -f codex-web
```

Use absolute host paths for `CODEX_HOME` and `WORKSPACE_DIR`. The entrypoint adjusts the container user to `PUID`/`PGID`, then drops root privileges before starting Codex Web. The service has `no-new-privileges`, an init process, a health check, and a loopback-only port mapping by default.

For remote access, keep the application port private and proxy it through an authenticated HTTPS endpoint. Compose deliberately does not mount `docker.sock`.

Images are published to GHCR from `main` and version tags for both amd64 and arm64. Pull a fixed version tag in production rather than `latest` when reproducibility matters.

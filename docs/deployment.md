# Deployment

Production builds are served by Fastify on `127.0.0.1:3001`. For remote use, place Caddy, nginx, or Traefik in front with HTTPS and authentication, and restrict access to trusted users. Do not expose app-server, mount `CODEX_HOME` into a web root, or bind publicly without an access-control layer.

Environment variables:

- `CODEX_BIN`: server-controlled absolute Codex executable path
- `HOST`: listen address; defaults to `127.0.0.1`
- `PORT`: HTTP port; defaults to `3001`
- `LOG_LEVEL`: reserved structured-log level

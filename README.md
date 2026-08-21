# Codex runtime adapter for assistant-ui

An assistant-ui Runtime Adapter for native Codex CLI threads. The core package exposes `useCodexRuntime()` plus a Node-only Codex bridge; the included Web application is a basic integration example, not the product UI.

```tsx
import { useCodexRuntime } from "@codex-web/react-codex";
import { AssistantRuntimeProvider } from "@assistant-ui/react";

const runtime = useCodexRuntime({ baseUrl: "/api/codex" });

return <AssistantRuntimeProvider runtime={runtime}><Thread /></AssistantRuntimeProvider>;
```

Codex remains the only thread source of truth. The bridge talks to `codex app-server` over stdio JSONL and never parses or copies `~/.codex` sessions.

This project is an independent open-source client for OpenAI Codex.

It is not affiliated with or endorsed by OpenAI.

## Requirements

- Node.js 22 or newer
- pnpm 11
- Codex CLI 0.147.0 or a compatible version
- An authenticated Codex CLI installation

## Packages

- `@codex-web/react-codex`: browser Runtime Adapter
- `@codex-web/react-codex/server`: Node app-server lifecycle bridge
- `apps/web` + `apps/server`: deployable basic example

## Example development

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`. The API listens on `127.0.0.1:3001`. Opening a thread is read-only; Codex only resumes it when a prompt is sent.

Useful commands:

```bash
pnpm debug:threads
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm build
```

Set `CODEX_BIN=/absolute/path/to/codex` to select the CLI executable. The browser cannot control this value.

## Production

```bash
pnpm build
pnpm start
```

The Fastify server serves `apps/web/dist` on `127.0.0.1:3001`. Put an authenticated HTTPS reverse proxy in front before remote access. See [deployment](docs/deployment.md).

## Docker deployment (no clone required)

The public image includes the tested Codex CLI and runs the service as a non-root user. You can start it directly without cloning this repository:

```bash
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

Open `http://127.0.0.1:3001`. The default bind is loopback-only. The container uses the mounted Codex authentication and native threads directly; it does not copy them into another database.

For a standalone Compose file, upgrades, logs, and production notes, see [deployment](docs/deployment.md). Published images are available at `ghcr.io/yanxiangrong/codex-web` for `linux/amd64` and `linux/arm64`.

## License

Apache-2.0. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

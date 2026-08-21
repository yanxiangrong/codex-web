# Codex Web

An open-source browser client for native Codex CLI threads. Codex remains the only thread source of truth; this project talks to `codex app-server` over stdio JSONL and never parses or copies `~/.codex` sessions.

This project is an independent open-source client for OpenAI Codex.

It is not affiliated with or endorsed by OpenAI.

## Requirements

- Node.js 22 or newer
- pnpm 11
- Codex CLI 0.147.0 or a compatible version
- An authenticated Codex CLI installation

## Development

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

## License

Apache-2.0. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

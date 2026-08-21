# Contributing

Install dependencies with `pnpm install`, make focused changes, and run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Protocol changes must be generated with `pnpm generate:codex-types`, keep stable APIs only, and preserve fail-closed approvals. Do not add a conversation database or read Codex session files directly.

# Protocol

Codex app-server uses newline-delimited JSON-RPC 2.0 over stdio. Generated TypeScript in `packages/codex-client/src/generated` matches the version in `TESTED_CODEX_VERSION`.

The public HTTP projection includes health and diagnostics, thread list/read/create/name/archive, turn start/interrupt, SSE events, and approval responses. Generated Codex types are never exposed directly to the browser.

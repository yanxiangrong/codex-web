# Architecture

The repository's core product is a Codex runtime adapter for assistant-ui, not a fixed chat application.

```text
User assistant-ui application
  -> useCodexRuntime()
  -> HTTP + SSE bridge
  -> codex app-server --stdio
  -> native ~/.codex threads
```

## Core packages

- `packages/assistant-runtime` publishes `@codex-web/react-codex`. Its browser entry owns thread/message conversion and the `ExternalStoreRuntime`; its `/server` entry owns Node-only Codex lifecycle primitives.
- `packages/codex-client` is independent of React and assistant-ui. It implements stdio JSONL, JSON-RPC, generated Codex types, and the initialize handshake.
- `packages/protocol` contains the thin HTTP/SSE projection and is never persisted.

## Reference application

`apps/web` and `apps/server` are the deployable basic example. Registry UI under `apps/web/src/components` proves that the adapter works with assistant-ui Base components; it is not part of the adapter package API.

The example server is also the current reference HTTP/SSE handler. It owns no transcript database. Opening a thread calls `thread/read`; sending calls `thread/resume` before `turn/start`.

## Public API

```tsx
const runtime = useCodexRuntime({ baseUrl: "/api" });

<AssistantRuntimeProvider runtime={runtime}>
  <Thread />
</AssistantRuntimeProvider>
```

```ts
import { createCodexBridge } from "@codex-web/react-codex/server";
```

SSE is a transport, not authoritative state. Codex remains the only thread source of truth. Approvals remain in memory and fail closed on timeout, missing browser connection, unknown request type, or shutdown.

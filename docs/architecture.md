# Architecture

The browser sends commands by REST and receives runtime events by SSE. Fastify owns no transcript database. `packages/codex-client` starts `codex app-server --stdio`, performs the stable initialize handshake, and routes JSON-RPC. `packages/protocol` contains browser-facing projections, while `packages/assistant-runtime` is the only adapter coupled to assistant-ui.

SSE is not authoritative. On connection or event gaps, the browser reads the thread again. Opening a thread calls `thread/read`; sending the first prompt lazily calls `thread/resume` before `turn/start`.

Approvals are held only in memory and fail closed on timeout, missing browser connection, malformed input, unknown request type, or shutdown.

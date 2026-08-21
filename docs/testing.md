# Testing

Unit tests cover JSONL framing, concurrent RPC routing, failures, timeout, process closure, overload backoff, and approvals. Integration tests run the real client and HTTP server against `tests/fake-app-server`, without credentials or model usage. Playwright covers the browser-to-server-to-fake-runtime path.

`pnpm debug:threads` and optional manual turns provide real app-server smoke coverage.

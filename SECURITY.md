# Security

Codex Web can operate a coding agent capable of running commands and editing files. It binds to `127.0.0.1` by default, denies cross-origin requests, keeps app-server on stdio, and treats every unrecognized, disconnected, or expired approval as denied.

Do not expose the server directly to an untrusted network. Use HTTPS and authentication at a reverse proxy. Never serve `CODEX_HOME` as static content.

Please report vulnerabilities privately to the repository maintainers rather than opening a public issue.

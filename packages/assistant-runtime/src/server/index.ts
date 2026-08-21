import { CodexClient, type CodexProcessOptions } from "@codex-web/codex-client";

export interface CodexBridgeOptions extends CodexProcessOptions {
  approvalTimeoutMs?: number;
}

export interface CodexBridge {
  client: CodexClient;
  start(): Promise<unknown>;
  stop(): Promise<void>;
}

/** Node-only lifecycle bridge for `codex app-server --stdio`. */
export function createCodexBridge(options: CodexBridgeOptions = {}): CodexBridge {
  const client = new CodexClient(options);
  return { client, start: () => client.start(), stop: () => client.stop() };
}

export { CodexClient } from "@codex-web/codex-client";
export type { CodexProcessOptions } from "@codex-web/codex-client";

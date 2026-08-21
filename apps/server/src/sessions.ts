import type { CodexClient } from "@codex-web/codex-client";

export class SessionCoordinator {
  private readonly resumed = new Set<string>();
  private readonly activeTurns = new Map<string, string>();
  constructor(private readonly client: CodexClient) {}

  async startTurn(threadId: string, input: string): Promise<{ id: string }> {
    if (this.activeTurns.has(threadId)) throw new ActiveTurnError();
    if (!this.resumed.has(threadId)) { await this.client.resumeThread(threadId); this.resumed.add(threadId); }
    const turn = await this.client.startTurn(threadId, input);
    this.activeTurns.set(threadId, turn.id);
    return turn;
  }
  complete(threadId: string, turnId?: string): void { if (!turnId || this.activeTurns.get(threadId) === turnId) this.activeTurns.delete(threadId); }
  activeTurn(threadId: string): string | undefined { return this.activeTurns.get(threadId); }
}
export class ActiveTurnError extends Error {}

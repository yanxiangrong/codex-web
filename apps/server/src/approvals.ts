import type { CodexClient } from "@codex-web/codex-client";
import type { ApprovalDto } from "@codex-web/protocol";
import { EventBroadcaster } from "./events.js";

interface PendingApproval { dto: ApprovalDto; rpcId: string | number; timer: NodeJS.Timeout; }

export class ApprovalCoordinator {
  private readonly pending = new Map<string, PendingApproval>();
  constructor(private readonly client: CodexClient, private readonly events: EventBroadcaster, private readonly timeoutMs = 60_000) {
    events.onDisconnect((threadId) => this.denyThread(threadId));
  }

  handleRequest(rpcId: string | number, method: string, raw: unknown): void {
    if (method !== "item/commandExecution/requestApproval" && method !== "item/fileChange/requestApproval") {
      this.client.respondError(rpcId, -32601, "Unsupported server request denied by Codex Web");
      return;
    }
    const params = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const threadId = typeof params.threadId === "string" ? params.threadId : undefined;
    if (!threadId || this.events.connectionCount(threadId) === 0) {
      this.client.respond(rpcId, { decision: "decline" });
      return;
    }
    const requestId = String(rpcId);
    const dto: ApprovalDto = {
      requestId, method, threadId,
      turnId: typeof params.turnId === "string" ? params.turnId : undefined,
      itemId: typeof params.itemId === "string" ? params.itemId : undefined,
      reason: typeof params.reason === "string" ? params.reason : undefined,
      command: typeof params.command === "string" ? params.command : undefined,
      cwd: typeof params.cwd === "string" ? params.cwd : undefined,
      availableDecisions: ["accept", "acceptForSession", "decline", "cancel"],
      expiresAt: Date.now() + this.timeoutMs,
    };
    const timer = setTimeout(() => this.resolve(requestId, "decline"), this.timeoutMs);
    this.pending.set(requestId, { dto, rpcId, timer });
    this.events.publish("codex.approval.requested", dto, threadId);
  }

  resolve(requestId: string, decision: string): boolean {
    const pending = this.pending.get(requestId);
    if (!pending || !pending.dto.availableDecisions.includes(decision)) return false;
    clearTimeout(pending.timer); this.pending.delete(requestId);
    this.client.respond(pending.rpcId, { decision });
    this.events.publish("codex.approval.resolved", { requestId, decision }, pending.dto.threadId);
    return true;
  }

  denyAll(): void { for (const id of [...this.pending.keys()]) this.resolve(id, "decline"); }
  private denyThread(threadId?: string): void { for (const [id, pending] of this.pending) if (!threadId || pending.dto.threadId === threadId) this.resolve(id, "decline"); }
}

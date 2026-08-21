import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { ApprovalCoordinator } from "../apps/server/src/approvals.js";
import { EventBroadcaster } from "../apps/server/src/events.js";
import type { CodexClient } from "../packages/codex-client/src/client.js";

function setup(connected: boolean) {
  const client = { respond: vi.fn(), respondError: vi.fn() } as unknown as CodexClient;
  const events = new EventBroadcaster();
  if (connected) {
    const response = Object.assign(new EventEmitter(), { write: vi.fn() });
    events.subscribe(response as never, "thread-1");
  }
  return { client, events, coordinator: new ApprovalCoordinator(client, events, 20) };
}

describe("ApprovalCoordinator", () => {
  it("denies when no browser is connected", () => {
    const { client, coordinator } = setup(false);
    coordinator.handleRequest(1, "item/commandExecution/requestApproval", { threadId: "thread-1" });
    expect(client.respond).toHaveBeenCalledWith(1, { decision: "decline" });
  });
  it("accepts one valid browser decision and rejects duplicates", () => {
    const { client, coordinator } = setup(true);
    coordinator.handleRequest(2, "item/fileChange/requestApproval", { threadId: "thread-1" });
    expect(coordinator.resolve("2", "accept")).toBe(true);
    expect(coordinator.resolve("2", "accept")).toBe(false);
    expect(client.respond).toHaveBeenCalledWith(2, { decision: "accept" });
  });
  it("denies unknown request kinds", () => {
    const { client, coordinator } = setup(true);
    coordinator.handleRequest(3, "unknown/request", {});
    expect(client.respondError).toHaveBeenCalled();
  });
});

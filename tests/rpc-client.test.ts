import { describe, expect, it, vi } from "vitest";
import { RpcClosedError, RpcError, RpcTimeoutError } from "../packages/codex-client/src/errors.js";
import { JsonRpcClient } from "../packages/codex-client/src/rpc-client.js";

class MemoryTransport {
  writes: string[] = [];
  write(payload: string) { this.writes.push(payload); }
}

describe("JsonRpcClient", () => {
  it("routes concurrent responses by request id", async () => {
    const transport = new MemoryTransport();
    const rpc = new JsonRpcClient(transport);
    const first = rpc.request<string>("first");
    const second = rpc.request<string>("second");
    rpc.receive({ jsonrpc: "2.0", id: 2, result: "two" });
    rpc.receive({ jsonrpc: "2.0", id: 1, result: "one" });
    await expect(Promise.all([first, second])).resolves.toEqual(["one", "two"]);
  });

  it("rejects error responses", async () => {
    const rpc = new JsonRpcClient(new MemoryTransport());
    const pending = rpc.request("broken");
    rpc.receive({ id: 1, error: { code: -32601, message: "missing", data: { method: "broken" } } });
    await expect(pending).rejects.toEqual(expect.objectContaining<RpcError>({ code: -32601, message: "missing" }));
  });

  it("retries overload errors with bounded backoff", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const transport = new MemoryTransport();
    const rpc = new JsonRpcClient(transport, 1_000, 2);
    const pending = rpc.request<string>("busy");
    rpc.receive({ id: 1, error: { code: -32001, message: "Server overloaded; retry later." } });
    await vi.advanceTimersByTimeAsync(100);
    expect(transport.writes).toHaveLength(2);
    rpc.receive({ id: 2, result: "ready" });
    await expect(pending).resolves.toBe("ready");
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("times out requests", async () => {
    vi.useFakeTimers();
    const rpc = new JsonRpcClient(new MemoryTransport());
    const pending = rpc.request("slow", {}, 50);
    const assertion = expect(pending).rejects.toBeInstanceOf(RpcTimeoutError);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    vi.useRealTimers();
  });

  it("rejects all pending requests when closed", async () => {
    const rpc = new JsonRpcClient(new MemoryTransport());
    const pending = rpc.request("waiting");
    rpc.close();
    await expect(pending).rejects.toBeInstanceOf(RpcClosedError);
  });

  it("emits notifications, server requests, malformed and unknown responses safely", () => {
    const rpc = new JsonRpcClient(new MemoryTransport());
    const notification = vi.fn();
    const request = vi.fn();
    const malformed = vi.fn();
    rpc.on("notification", notification);
    rpc.on("request", request);
    rpc.on("malformed", malformed);
    rpc.receive({ method: "turn/started", params: { id: "turn" } });
    rpc.receive({ id: "approval", method: "item/commandExecution/requestApproval", params: {} });
    rpc.receive("invalid");
    rpc.receive({ id: 999, result: "unknown response" });
    expect(notification).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();
    expect(malformed).toHaveBeenCalledOnce();
  });
});

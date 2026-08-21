import { EventEmitter } from "node:events";
import { RpcClosedError, RpcError, RpcTimeoutError } from "./errors.js";

export interface RpcTransport {
  write(payload: string): void;
}

interface PendingRequest {
  method: string;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
  timer: NodeJS.Timeout;
}

export interface RpcClientEvents {
  notification: [method: string, params: unknown];
  request: [id: string | number, method: string, params: unknown];
  malformed: [payload: unknown];
}

export class JsonRpcClient extends EventEmitter<RpcClientEvents> {
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private closed = false;

  constructor(
    private readonly transport: RpcTransport,
    private readonly defaultTimeoutMs = 15_000,
    private readonly maxOverloadRetries = 3,
  ) {
    super();
  }

  request<T>(method: string, params?: unknown, timeoutMs = this.defaultTimeoutMs): Promise<T> {
    return this.requestWithRetry<T>(method, params, timeoutMs, 0);
  }

  private async requestWithRetry<T>(method: string, params: unknown, timeoutMs: number, attempt: number): Promise<T> {
    try {
      return await this.requestOnce<T>(method, params, timeoutMs);
    } catch (error) {
      if (!(error instanceof RpcError) || error.code !== -32001 || attempt >= this.maxOverloadRetries || this.closed) throw error;
      const delayMs = Math.min(2_000, 100 * (2 ** attempt)) + Math.floor(Math.random() * 50);
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      return this.requestWithRetry<T>(method, params, timeoutMs, attempt + 1);
    }
  }

  private requestOnce<T>(method: string, params: unknown, timeoutMs: number): Promise<T> {
    if (this.closed) return Promise.reject(new RpcClosedError());
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RpcTimeoutError(method, timeoutMs));
      }, timeoutMs);
      this.pending.set(id, { method, resolve: resolve as (value: unknown) => void, reject, timer });
      try {
        this.transport.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  notify(method: string, params?: unknown): void {
    if (this.closed) throw new RpcClosedError();
    const message: Record<string, unknown> = { jsonrpc: "2.0", method };
    if (params !== undefined) message.params = params;
    this.transport.write(`${JSON.stringify(message)}\n`);
  }

  receive(payload: unknown): void {
    if (!payload || typeof payload !== "object") {
      this.emit("malformed", payload);
      return;
    }
    const message = payload as Record<string, unknown>;
    if ("id" in message && ("result" in message || "error" in message) && typeof message.id === "number") {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error && typeof message.error === "object") {
        const error = message.error as { code?: unknown; message?: unknown; data?: unknown };
        pending.reject(new RpcError(String(error.message ?? "RPC error"), Number(error.code ?? -32603), error.data));
      } else pending.resolve(message.result);
      return;
    }
    if (typeof message.method === "string" && "id" in message && (typeof message.id === "number" || typeof message.id === "string")) {
      this.emit("request", message.id, message.method, message.params);
      return;
    }
    if (typeof message.method === "string") {
      this.emit("notification", message.method, message.params);
      return;
    }
    this.emit("malformed", payload);
  }

  respond(id: string | number, result: unknown): void {
    if (this.closed) throw new RpcClosedError();
    this.transport.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  respondError(id: string | number, code: number, message: string, data?: unknown): void {
    if (this.closed) throw new RpcClosedError();
    this.transport.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message, data } })}\n`);
  }

  close(reason = new RpcClosedError()): void {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
    this.pending.clear();
  }
}

import { EventEmitter } from "node:events";
import type { InitializeResponse } from "./generated/InitializeResponse.js";
import type { Thread } from "./generated/v2/Thread.js";
import type { ThreadListParams } from "./generated/v2/ThreadListParams.js";
import type { ThreadListResponse } from "./generated/v2/ThreadListResponse.js";
import type { ThreadReadResponse } from "./generated/v2/ThreadReadResponse.js";
import type { ThreadResumeResponse } from "./generated/v2/ThreadResumeResponse.js";
import type { ThreadStartParams } from "./generated/v2/ThreadStartParams.js";
import type { ThreadStartResponse } from "./generated/v2/ThreadStartResponse.js";
import type { TurnStartResponse } from "./generated/v2/TurnStartResponse.js";
import type { Turn } from "./generated/v2/Turn.js";
import { CodexProcess, type CodexProcessOptions } from "./process.js";
import { JsonRpcClient } from "./rpc-client.js";

export interface CodexClientEvents {
  notification: [method: string, params: unknown];
  request: [id: string | number, method: string, params: unknown];
  stderr: [text: string];
  malformed: [payload: unknown];
  exit: [code: number | null, signal: NodeJS.Signals | null];
}

export class CodexClient extends EventEmitter<CodexClientEvents> {
  private process?: CodexProcess;
  private rpc?: JsonRpcClient;
  private initializeResponse?: InitializeResponse;

  constructor(private readonly processOptions: CodexProcessOptions = {}) { super(); }

  async start(): Promise<InitializeResponse> {
    if (this.process) throw new Error("Codex client is already started");
    const codexProcess = new CodexProcess(this.processOptions);
    const rpc = new JsonRpcClient(codexProcess);
    this.process = codexProcess;
    this.rpc = rpc;
    codexProcess.on("message", (message) => rpc.receive(message));
    codexProcess.on("malformed", (_error, line) => this.emit("malformed", line));
    codexProcess.on("stderr", (text) => this.emit("stderr", text));
    codexProcess.on("error", (error) => rpc.close(error));
    codexProcess.on("exit", (code, signal) => {
      rpc.close();
      if (this.process === codexProcess) { this.process = undefined; this.rpc = undefined; }
      this.emit("exit", code, signal);
    });
    rpc.on("notification", (method, params) => this.emit("notification", method, params));
    rpc.on("request", (id, method, params) => this.emit("request", id, method, params));
    rpc.on("malformed", (payload) => this.emit("malformed", payload));
    codexProcess.start();
    try {
      this.initializeResponse = await rpc.request<InitializeResponse>("initialize", {
        clientInfo: { name: "codex-web", title: "Codex Web", version: "0.1.0" },
        capabilities: { experimentalApi: false, requestAttestation: false },
      });
      rpc.notify("initialized");
      return this.initializeResponse;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  listThreads(options: ThreadListParams = {}): Promise<ThreadListResponse> {
    return this.requireRpc().request("thread/list", options);
  }

  async readThread(threadId: string): Promise<Thread> {
    const response = await this.requireRpc().request<ThreadReadResponse>("thread/read", { threadId, includeTurns: true });
    return response.thread;
  }

  async startThread(options: ThreadStartParams = {}): Promise<Thread> {
    return (await this.requireRpc().request<ThreadStartResponse>("thread/start", options)).thread;
  }

  async resumeThread(threadId: string): Promise<Thread> {
    return (await this.requireRpc().request<ThreadResumeResponse>("thread/resume", { threadId })).thread;
  }

  async startTurn(threadId: string, input: string): Promise<Turn> {
    const response = await this.requireRpc().request<TurnStartResponse>("turn/start", { threadId, input: [{ type: "text", text: input, text_elements: [] }] });
    return response.turn;
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> { await this.requireRpc().request("turn/interrupt", { threadId, turnId }); }
  async renameThread(threadId: string, name: string): Promise<void> { await this.requireRpc().request("thread/name/set", { threadId, name }); }
  async archiveThread(threadId: string): Promise<void> { await this.requireRpc().request("thread/archive", { threadId }); }
  async unarchiveThread(threadId: string): Promise<void> { await this.requireRpc().request("thread/unarchive", { threadId }); }

  respond(id: string | number, result: unknown): void { this.requireRpc().respond(id, result); }
  respondError(id: string | number, code: number, message: string): void { this.requireRpc().respondError(id, code, message); }

  get connected(): boolean { return this.rpc !== undefined; }
  get info(): InitializeResponse | undefined { return this.initializeResponse; }

  async stop(): Promise<void> {
    this.rpc?.close();
    await this.process?.stop();
    this.rpc = undefined;
    this.process = undefined;
  }

  private requireRpc(): JsonRpcClient {
    if (!this.rpc) throw new Error("Codex client is not started");
    return this.rpc;
  }
}

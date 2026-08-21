import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { JsonlReader } from "./jsonl.js";

export interface CodexProcessOptions {
  command?: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface CodexProcessEvents {
  message: [payload: unknown];
  malformed: [error: SyntaxError, line: string];
  stderr: [text: string];
  exit: [code: number | null, signal: NodeJS.Signals | null];
  error: [error: Error];
}

export class CodexProcess extends EventEmitter<CodexProcessEvents> {
  private child?: ChildProcessWithoutNullStreams;

  constructor(private readonly options: CodexProcessOptions = {}) {
    super();
  }

  start(): void {
    if (this.child) throw new Error("Codex process is already running");
    const child = spawn(this.options.command ?? process.env.CODEX_BIN ?? "codex", this.options.args ?? ["app-server", "--stdio"], {
      cwd: this.options.cwd,
      env: { ...process.env, ...this.options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    const reader = new JsonlReader();
    reader.on("value", (value) => this.emit("message", value));
    reader.on("malformed", (error, line) => this.emit("malformed", error, line));
    child.stdout.on("data", (chunk: Buffer) => reader.push(chunk));
    child.stdout.on("end", () => reader.end());
    child.stderr.on("data", (chunk: Buffer) => this.emit("stderr", chunk.toString("utf8")));
    child.on("error", (error) => this.emit("error", error));
    child.on("exit", (code, signal) => {
      this.child = undefined;
      this.emit("exit", code, signal);
    });
  }

  write(payload: string): void {
    if (!this.child?.stdin.writable) throw new Error("Codex process is not running");
    this.child.stdin.write(payload);
  }

  async stop(timeoutMs = 2_000): Promise<void> {
    const child = this.child;
    if (!child) return;
    child.stdin.end();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
    });
  }
}

import { EventEmitter } from "node:events";

export interface JsonlReaderEvents {
  value: [value: unknown];
  malformed: [error: SyntaxError, line: string];
}

export class JsonlReader extends EventEmitter<JsonlReaderEvents> {
  private buffer = "";
  private readonly decoder = new TextDecoder("utf-8", { fatal: false });

  push(chunk: Uint8Array): void {
    this.buffer += this.decoder.decode(chunk, { stream: true });
    this.drainLines();
  }

  end(): void {
    this.buffer += this.decoder.decode();
    if (this.buffer.length > 0) this.parseLine(this.buffer.replace(/\r$/, ""));
    this.buffer = "";
  }

  private drainLines(): void {
    let newline = this.buffer.indexOf("\n");
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      this.parseLine(line);
      newline = this.buffer.indexOf("\n");
    }
  }

  private parseLine(line: string): void {
    if (line.trim() === "") return;
    try {
      this.emit("value", JSON.parse(line));
    } catch (error) {
      this.emit("malformed", error as SyntaxError, line);
    }
  }
}

export function encodeJsonl(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

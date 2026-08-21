import type { ServerEvent } from "@codex-web/protocol";
import type { ServerResponse } from "node:http";

interface Subscriber { response: ServerResponse; threadId?: string; }

export class EventBroadcaster {
  private seq = 0;
  private readonly subscribers = new Set<Subscriber>();
  private readonly disconnectHandlers = new Set<(threadId?: string) => void>();

  subscribe(response: ServerResponse, threadId?: string): () => void {
    const subscriber = { response, threadId };
    this.subscribers.add(subscriber);
    response.write(`event: connected\ndata: ${JSON.stringify({ seq: this.seq })}\n\n`);
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 15_000);
    return () => {
      clearInterval(heartbeat);
      if (!this.subscribers.delete(subscriber)) return;
      if (this.connectionCount(threadId) === 0) for (const handler of this.disconnectHandlers) handler(threadId);
    };
  }

  publish(type: string, payload: unknown, threadId?: string): ServerEvent {
    const event: ServerEvent = { seq: ++this.seq, type, payload, ...(threadId ? { threadId } : {}) };
    const line = `id: ${event.seq}\nevent: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const subscriber of this.subscribers) if (!subscriber.threadId || !threadId || subscriber.threadId === threadId) subscriber.response.write(line);
    return event;
  }

  connectionCount(threadId?: string): number {
    return [...this.subscribers].filter((subscriber) => !threadId || !subscriber.threadId || subscriber.threadId === threadId).length;
  }

  onDisconnect(handler: (threadId?: string) => void): () => void { this.disconnectHandlers.add(handler); return () => this.disconnectHandlers.delete(handler); }
}

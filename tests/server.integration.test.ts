import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CodexClient } from "../packages/codex-client/src/client.js";
import { createApp } from "../apps/server/src/app.js";

const fakeServer = fileURLToPath(new URL("./fake-app-server/server.mjs", import.meta.url));

describe("HTTP server contract", () => {
  it("lists, reads, resumes lazily, starts turns, and enforces the turn mutex", async () => {
    const client = new CodexClient({ command: process.execPath, args: [fakeServer] });
    await client.start();
    const app = createApp(client);
    try {
      expect((await app.inject({ method: "GET", url: "/api/threads" })).statusCode).toBe(200);
      const read = await app.inject({ method: "GET", url: "/api/threads/019fake-thread" });
      expect(read.json().turns).toHaveLength(1);
      const started = await app.inject({ method: "POST", url: "/api/threads/019fake-thread/turns", payload: { input: "hold" } });
      expect(started.statusCode).toBe(202);
      const conflict = await app.inject({ method: "POST", url: "/api/threads/019fake-thread/turns", payload: { input: "again" } });
      expect(conflict.statusCode).toBe(409);
      expect((await app.inject({ method: "POST", url: "/api/threads/019fake-thread/turns/turn-active/interrupt" })).statusCode).toBe(200);
    } finally { await app.close(); await client.stop(); }
  });

  it("rejects cross-origin requests", async () => {
    const client = new CodexClient({ command: process.execPath, args: [fakeServer] }); await client.start();
    const app = createApp(client);
    try { expect((await app.inject({ method: "GET", url: "/api/health", headers: { origin: "https://evil.example", host: "localhost" } })).statusCode).toBe(403); }
    finally { await app.close(); await client.stop(); }
  });

  it("starts the first turn without reading or resuming an unmaterialized thread", async () => {
    const client = new CodexClient({ command: process.execPath, args: [fakeServer] }); await client.start();
    const app = createApp(client);
    try {
      const created = await app.inject({ method: "POST", url: "/api/threads" });
      expect(created.statusCode).toBe(201);
      expect(created.json().id).toBe("019new-thread");
      expect(created.json().turns).toEqual([]);
      const firstTurn = await app.inject({ method: "POST", url: "/api/threads/019new-thread/turns", payload: { input: "First message" } });
      expect(firstTurn.statusCode).toBe(202);
      expect(firstTurn.json().turnId).toBe("turn-new");
      const materialized = await app.inject({ method: "GET", url: "/api/threads/019new-thread" });
      expect(materialized.statusCode).toBe(200);
      expect(materialized.json().turns[0].items[0].text).toBe("First message");
    } finally { await app.close(); await client.stop(); }
  });
});

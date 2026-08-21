import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CodexClient } from "../packages/codex-client/src/client.js";

const fakeServer = fileURLToPath(new URL("./fake-app-server/server.mjs", import.meta.url));

describe("CodexClient with fake app-server", () => {
  it("initializes, lists threads, and reads complete history", async () => {
    const client = new CodexClient({ command: process.execPath, args: [fakeServer] });
    try {
      const initialized = await client.start();
      expect(initialized.platformOs).toBe("linux");
      const page = await client.listThreads({ limit: 10 });
      expect(page.data).toHaveLength(1);
      expect(page.data[0]?.id).toBe("019fake-thread");
      const thread = await client.readThread("019fake-thread");
      expect(thread.turns).toHaveLength(1);
      await client.resumeThread("019fake-thread");
      const turn = await client.startTurn("019fake-thread", "hello");
      expect(turn.id).toBe("turn-active");
      await client.interruptTurn("019fake-thread", turn.id);
    } finally {
      await client.stop();
    }
  });
});

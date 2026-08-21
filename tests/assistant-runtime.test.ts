import { describe, expect, it } from "vitest";
import { toAssistantMessages } from "../packages/assistant-runtime/src/messages.js";
import type { UiTurn } from "@codex-web/protocol";

describe("Codex to assistant-ui message conversion", () => {
  it("maps coding-agent items to official message parts", () => {
    const turns: UiTurn[] = [{ id: "turn", status: "completed", items: [
      { type: "reasoning", id: "r", summary: ["Inspecting"], content: ["Done"] },
      { type: "commandExecution", id: "c", command: "pnpm test", cwd: "/workspace", output: "ok", exitCode: 0, status: "completed" },
      { type: "fileChange", id: "f", status: "completed", changes: [{ path: "a.ts", diff: "+x", kind: "update" }] },
      { type: "unknown", id: "u", codexType: "futureItem" },
    ] }];
    const messages = toAssistantMessages(turns);
    expect(messages).toHaveLength(4);
    expect(messages[0]?.content).toEqual([{ type: "reasoning", text: "Inspecting\nDone" }]);
    expect(messages[1]?.content[0]).toMatchObject({ type: "tool-call", toolName: "codex.commandExecution" });
    expect(messages[2]?.content[0]).toMatchObject({ type: "tool-call", toolName: "codex.fileChange" });
    expect(messages[3]?.content[0]).toMatchObject({ type: "tool-call", toolName: "codex.futureItem" });
  });

  it("keeps streaming assistant messages running", () => {
    const messages = toAssistantMessages([{ id: "t", status: "inProgress", items: [{ type: "agentMessage", id: "a", text: "partial" }] }]);
    expect(messages[0]?.status).toEqual({ type: "running" });
  });
});

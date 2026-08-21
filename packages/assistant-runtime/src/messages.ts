import type { ThreadMessageLike } from "@assistant-ui/react";
import type { UiTurn } from "@codex-web/protocol";

export function toAssistantMessages(turns: UiTurn[]): ThreadMessageLike[] {
  return turns.flatMap((turn) => turn.items.flatMap((item): ThreadMessageLike[] => {
    if (item.type === "userMessage") return [{ id: item.id, role: "user", content: [{ type: "text", text: item.text }] }];
    if (item.type === "agentMessage") return [{ id: item.id, role: "assistant", content: [{ type: "text", text: item.text }], status: turn.status === "inProgress" ? { type: "running" } : { type: "complete", reason: "stop" } }];
    if (item.type === "reasoning") return [{ id: item.id, role: "assistant", content: [{ type: "reasoning", text: [...item.summary, ...item.content].join("\n") }], status: turn.status === "inProgress" ? { type: "running" } : { type: "complete", reason: "stop" } } as ThreadMessageLike];
    if (item.type === "commandExecution") return [{ id: item.id, role: "assistant", content: [{ type: "tool-call", toolCallId: item.id, toolName: "codex.commandExecution", args: { command: item.command, cwd: item.cwd }, result: { output: item.output, exitCode: item.exitCode, status: item.status } }], status: turn.status === "inProgress" ? { type: "running" } : { type: "complete", reason: "stop" } } as ThreadMessageLike];
    if (item.type === "fileChange") return [{ id: item.id, role: "assistant", content: [{ type: "tool-call", toolCallId: item.id, toolName: "codex.fileChange", args: { changes: item.changes }, result: { status: item.status } }], status: turn.status === "inProgress" ? { type: "running" } : { type: "complete", reason: "stop" } } as ThreadMessageLike];
    return [{ id: item.id, role: "assistant", content: [{ type: "tool-call", toolCallId: item.id, toolName: `codex.${item.codexType}`, args: { codexType: item.codexType }, result: { unsupported: true } }], status: { type: "complete", reason: "stop" } } as unknown as ThreadMessageLike];
  }));
}

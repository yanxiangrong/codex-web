import type { ThreadMessageLike } from "@assistant-ui/react";
import type { UiTurn } from "@codex-web/protocol";

export function toAssistantMessages(turns: UiTurn[]): ThreadMessageLike[] {
  return turns.flatMap((turn) => turn.items.flatMap((item): ThreadMessageLike[] => {
    if (item.type === "userMessage") return [{ id: item.id, role: "user", content: [{ type: "text", text: item.text }] }];
    if (item.type === "agentMessage") return [{ id: item.id, role: "assistant", content: [{ type: "text", text: item.text }], status: { type: "complete", reason: "stop" } }];
    return [];
  }));
}

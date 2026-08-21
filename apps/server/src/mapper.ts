import type { Thread, ThreadListResponse } from "@codex-web/codex-client";
import type { ThreadDetail, ThreadListDto, ThreadSummary, UiItem } from "@codex-web/protocol";

function statusName(status: unknown): string {
  if (typeof status === "string") return status;
  if (status && typeof status === "object" && "type" in status) return String((status as { type: unknown }).type);
  return "unknown";
}
function summary(thread: Thread): ThreadSummary {
  return { id: thread.id, name: thread.name ?? undefined, preview: thread.preview, cwd: String(thread.cwd), archived: false, status: statusName(thread.status), createdAt: thread.createdAt, updatedAt: thread.updatedAt };
}
function mapItem(item: Thread["turns"][number]["items"][number]): UiItem {
  const rawItem = item as unknown as Record<string, unknown>;
  switch (item.type) {
    case "userMessage": return { type: "userMessage", id: item.id, text: item.content.map((part) => part.type === "text" ? part.text : `[${part.type}]`).join("\n") };
    case "agentMessage": return { type: "agentMessage", id: item.id, text: item.text };
    case "reasoning": return { type: "reasoning", id: item.id, summary: item.summary, content: item.content };
    case "commandExecution": return { type: "commandExecution", id: item.id, command: item.command, cwd: String(item.cwd), output: item.aggregatedOutput ?? undefined, exitCode: item.exitCode ?? undefined, status: statusName(item.status) };
    case "fileChange": return { type: "fileChange", id: item.id, status: statusName(item.status), changes: item.changes.map((change) => ({ path: String(change.path), diff: change.diff, kind: statusName(change.kind) })) };
    default: { const codexType = String(rawItem.type ?? "unknown"); return { type: "unknown", id: String(rawItem.id ?? `unknown-${codexType}`), codexType, raw: process.env.NODE_ENV === "development" ? rawItem : undefined }; }
  }
}
export function mapThreadList(page: ThreadListResponse): ThreadListDto { return { data: page.data.map(summary), nextCursor: page.nextCursor ?? undefined }; }
export function mapThread(thread: Thread): ThreadDetail { return { ...summary(thread), turns: thread.turns.map((turn) => ({ id: turn.id, status: statusName(turn.status), items: turn.items.map(mapItem) })) }; }

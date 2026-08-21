import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type ExternalStoreThreadData,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { ApprovalDto, ServerEvent, ThreadDetail, ThreadListDto, ThreadSummary } from "@codex-web/protocol";
import { toAssistantMessages } from "./messages.js";

export interface CodexRuntimeOptions {
  baseUrl?: string;
  eventUrl?: string;
  threadLimit?: number;
  cwd?: string;
  onError?: (error: Error) => void;
  onApproval?: (approval: ApprovalDto) => void;
}

export interface CodexRuntimeExtras {
  connection: "connected" | "reconnecting" | "offline";
  approvals: readonly ApprovalDto[];
  resolveApproval: (requestId: string, decision: string) => Promise<void>;
}

const textFrom = (message: AppendMessage) => message.content
  .filter((part): part is Extract<(typeof message.content)[number], { type: "text" }> => part.type === "text")
  .map((part) => part.text).join("\n").trim();

export function useCodexRuntime(options: CodexRuntimeOptions = {}) {
  const baseUrl = (options.baseUrl ?? "/api").replace(/\/$/, "");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [active, setActive] = useState<ThreadDetail>();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [connection, setConnection] = useState<CodexRuntimeExtras["connection"]>("reconnecting");
  const [approvals, setApprovals] = useState<ApprovalDto[]>([]);
  const activeRef = useRef<ThreadDetail | undefined>(undefined);
  activeRef.current = active;

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((body as { error?: string }).error ?? `Codex request failed (${response.status})`);
    return body as T;
  }, [baseUrl]);
  const report = useCallback((reason: unknown) => options.onError?.(reason instanceof Error ? reason : new Error(String(reason))), [options.onError]);
  const read = useCallback(async (id: string) => { const value = await request<ThreadDetail>(`/threads/${encodeURIComponent(id)}`); setActive(value); setRunning(value.turns.some((turn) => turn.status === "inProgress")); }, [request]);
  const loadThreads = useCallback(async () => { const page = await request<ThreadListDto>(`/threads?limit=${options.threadLimit ?? 30}`); setThreads(page.data); setLoading(false); }, [request, options.threadLimit]);

  useEffect(() => { void loadThreads().catch(report); }, [loadThreads, report]);
  useEffect(() => {
    const eventUrl = options.eventUrl ?? `${baseUrl}/events`;
    const source = new EventSource(eventUrl);
    let refresh: ReturnType<typeof setTimeout> | undefined;
    source.addEventListener("connected", () => setConnection("connected"));
    source.onerror = () => setConnection("reconnecting");
    const receive = (raw: MessageEvent) => {
      try {
        const event = JSON.parse(raw.data) as ServerEvent;
        if (event.type === "codex.approval.requested") { const approval = event.payload as ApprovalDto; setApprovals((items) => [...items.filter((item) => item.requestId !== approval.requestId), approval]); options.onApproval?.(approval); }
        if (event.type === "codex.approval.resolved") setApprovals((items) => items.filter((item) => item.requestId !== (event.payload as { requestId: string }).requestId));
        clearTimeout(refresh);
        refresh = setTimeout(() => { const id = activeRef.current?.id; if (id) void read(id).catch(report); }, 50);
      } catch (error) { report(error); }
    };
    ["codex.turn.started", "codex.turn.completed", "codex.item.started", "codex.item.completed", "codex.item.agentMessage.delta", "codex.item.reasoning.summaryTextDelta", "codex.item.commandExecution.outputDelta", "codex.turn.diffUpdated", "codex.approval.requested", "codex.approval.resolved"].forEach((name) => source.addEventListener(name, receive as EventListener));
    source.addEventListener("codex.connection.closed", () => setConnection("offline"));
    source.addEventListener("codex.connection.ready", () => { setConnection("connected"); void loadThreads().catch(report); });
    return () => { clearTimeout(refresh); source.close(); };
  }, [baseUrl, loadThreads, options.eventUrl, options.onApproval, read, report]);

  const threadData = useMemo<ExternalStoreThreadData<"regular">[]>(() => threads.map((thread) => ({ status: "regular", id: thread.id, title: thread.name ?? (thread.preview || "New Thread"), custom: { cwd: thread.cwd, updatedAt: thread.updatedAt } })), [threads]);
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: toAssistantMessages(active?.turns ?? []), convertMessage: (message) => message, isRunning: running,
    onNew: async (message) => { const text = textFrom(message); if (!text || !active) return; await request(`/threads/${encodeURIComponent(active.id)}/turns`, { method: "POST", body: JSON.stringify({ input: text }) }); setRunning(true); await read(active.id); },
    onCancel: async () => { const turn = [...(active?.turns ?? [])].reverse().find((item) => item.status === "inProgress"); if (active && turn) await request(`/threads/${encodeURIComponent(active.id)}/turns/${encodeURIComponent(turn.id)}/interrupt`, { method: "POST" }); },
    adapters: { threadList: {
      threadId: active?.id, threads: threadData, isLoading: loading,
      onSwitchToNewThread: async () => { const thread = await request<ThreadDetail>("/threads", { method: "POST", body: JSON.stringify({ cwd: options.cwd }) }); setActive(thread); setThreads((items) => [thread, ...items.filter((item) => item.id !== thread.id)]); },
      onSwitchToThread: read,
      onRename: async (id, title) => { await request(`/threads/${encodeURIComponent(id)}/name`, { method: "PATCH", body: JSON.stringify({ name: title }) }); await loadThreads(); },
      onArchive: async (id) => { await request(`/threads/${encodeURIComponent(id)}/archive`, { method: "POST" }); if (activeRef.current?.id === id) setActive(undefined); await loadThreads(); },
    } },
  });

  const extras: CodexRuntimeExtras = {
    connection, approvals,
    resolveApproval: async (requestId, decision) => { await request(`/approvals/${encodeURIComponent(requestId)}`, { method: "POST", body: JSON.stringify({ decision }) }); setApprovals((items) => items.filter((item) => item.requestId !== requestId)); },
  };
  return Object.assign(runtime, { codex: extras });
}

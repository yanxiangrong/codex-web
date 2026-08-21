import type { ApprovalDto, ServerEvent, ThreadDetail, ThreadSummary } from "@codex-web/protocol";
import { create } from "zustand";
import { api } from "./api.js";

interface Store {
  threads: ThreadSummary[]; active?: ThreadDetail; nextCursor?: string; approvals: ApprovalDto[];
  connection: "connected" | "reconnecting" | "offline"; loading: boolean; error?: string; eventSource?: EventSource;
  loadThreads(cursor?: string): Promise<void>; selectThread(id: string): Promise<void>; refresh(): Promise<void>;
  connect(): void; send(input: string): Promise<void>; interrupt(): Promise<void>; resolveApproval(approval: ApprovalDto, decision: string): Promise<void>;
}
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

export const useCodexStore = create<Store>((set, get) => ({
  threads: [], approvals: [], connection: "reconnecting", loading: false,
  async loadThreads(cursor) {
    try { const page = await api.threads(cursor); set((state) => ({ threads: cursor ? [...state.threads, ...page.data] : page.data, nextCursor: page.nextCursor, error: undefined })); }
    catch (error) { set({ error: error instanceof Error ? error.message : "Unable to load threads" }); }
  },
  async selectThread(id) {
    set({ loading: true, error: undefined });
    try { set({ active: await api.thread(id), loading: false }); }
    catch (error) { set({ loading: false, error: error instanceof Error ? error.message : "Unable to read thread" }); }
  },
  async refresh() { const id = get().active?.id; if (id) { try { set({ active: await api.thread(id) }); } catch { /* SSE will retry */ } } },
  connect() {
    get().eventSource?.close();
    const source = new EventSource("/api/events"); set({ eventSource: source, connection: "reconnecting" });
    source.addEventListener("connected", () => set({ connection: "connected" }));
    source.onerror = () => set({ connection: "reconnecting" });
    source.onmessage = () => undefined;
    const onEvent = (raw: MessageEvent) => {
      const event = JSON.parse(raw.data) as ServerEvent;
      if (event.type === "codex.approval.requested") set((state) => ({ approvals: [...state.approvals.filter((item) => item.requestId !== (event.payload as ApprovalDto).requestId), event.payload as ApprovalDto] }));
      if (event.type === "codex.approval.resolved") set((state) => ({ approvals: state.approvals.filter((item) => item.requestId !== (event.payload as { requestId: string }).requestId) }));
      clearTimeout(refreshTimer); refreshTimer = setTimeout(() => void get().refresh(), 80);
    };
    ["codex.turn.started", "codex.turn.completed", "codex.item.started", "codex.item.completed", "codex.item.agentMessage.delta", "codex.item.reasoning.summaryTextDelta", "codex.item.commandExecution.outputDelta", "codex.turn.diffUpdated", "codex.approval.requested", "codex.approval.resolved"].forEach((name) => source.addEventListener(name, onEvent as EventListener));
    source.addEventListener("codex.connection.closed", () => set({ connection: "offline" }));
    source.addEventListener("codex.connection.ready", () => { set({ connection: "connected" }); void get().loadThreads(); void get().refresh(); });
  },
  async send(input) { const id = get().active?.id; if (!id) return; await api.startTurn(id, input); await get().refresh(); },
  async interrupt() { const thread = get().active; const turn = [...(thread?.turns ?? [])].reverse().find((item) => item.status === "inProgress"); if (thread && turn) await api.interrupt(thread.id, turn.id); },
  async resolveApproval(approval, decision) { await api.approve(approval, decision); set((state) => ({ approvals: state.approvals.filter((item) => item.requestId !== approval.requestId) })); },
}));

import { useEffect } from "react";
import { CodexRuntimeProvider, toAssistantMessages } from "@codex-web/assistant-runtime";
import type { ApprovalDto } from "@codex-web/protocol";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Activity } from "./Activity.js";
import { api } from "./api.js";
import { useCodexStore } from "./store.js";

function ApprovalCard({ approval }: { approval: ApprovalDto }) {
  const resolve = useCodexStore((state) => state.resolveApproval);
  return <div className="approval"><div><strong>Approval required</strong><span>{approval.reason ?? approval.method}</span></div>{approval.command && <pre>$ {approval.command}</pre>}<div className="approval-actions">{approval.availableDecisions.map((decision) => <button className={decision === "decline" || decision === "cancel" ? "danger" : ""} key={decision} onClick={() => void resolve(approval, decision)}>{decision}</button>)}</div></div>;
}

export default function App() {
  const store = useCodexStore();
  useEffect(() => { void store.loadThreads(); store.connect(); return () => useCodexStore.getState().eventSource?.close(); }, []);
  const activeRunning = store.active?.turns.some((turn) => turn.status === "inProgress") ?? false;
  const threadData = store.threads.map((thread) => ({ status: "regular" as const, id: thread.id, title: thread.name ?? (thread.preview || "New Thread"), custom: { cwd: thread.cwd, updatedAt: thread.updatedAt } }));
  async function renameThread(id: string, title: string) { await api.rename(id, title); await store.loadThreads(); if (store.active?.id === id) await store.refresh(); }
  async function archiveThread(id: string) { await api.archive(id); if (useCodexStore.getState().active?.id === id) useCodexStore.setState({ active: undefined }); await store.loadThreads(); }

  return <TooltipProvider>
    <CodexRuntimeProvider messages={toAssistantMessages(store.active?.turns ?? [])} isRunning={activeRunning} onSend={store.send} onCancel={store.interrupt} threadId={store.active?.id} threads={threadData} isThreadsLoading={store.loading} onNewThread={store.createThread} onSwitchThread={store.selectThread} onRenameThread={renameThread} onArchiveThread={archiveThread}>
      <main className="official-shell">
        <aside className="official-sidebar">
          <div className="official-brand"><span className="logo">C</span><div><strong>Codex Web</strong><small>Native Codex threads</small></div><i className={store.connection} title={store.connection} /></div>
          <ThreadList />
        </aside>
        <section className="official-workspace">
          {store.error && <div className="error-banner">{store.error}<button onClick={() => useCodexStore.setState({ error: undefined })}>×</button></div>}
          {store.active ? <><header className="official-header"><div><h1>{store.active.name ?? (store.active.preview || "New Thread")}</h1><span>{store.active.cwd}</span></div></header><div className="official-thread"><Thread /></div><Activity turns={store.active.turns} />{store.approvals.filter((item) => item.threadId === store.active?.id).map((item) => <ApprovalCard key={item.requestId} approval={item} />)}</> : <div className="official-empty"><div className="logo large">C</div><h1>Continue your Codex work</h1><p>Select a native thread or create a new one.</p></div>}
        </section>
      </main>
    </CodexRuntimeProvider>
  </TooltipProvider>;
}

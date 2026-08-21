import { useEffect, useMemo, useState } from "react";
import type { ApprovalDto } from "@codex-web/protocol";
import { Activity } from "./Activity.js";
import { AssistantThread } from "./AssistantThread.js";
import { api } from "./api.js";
import { useCodexStore } from "./store.js";

function ApprovalCard({ approval }: { approval: ApprovalDto }) {
  const resolve = useCodexStore((state) => state.resolveApproval);
  return <div className="approval"><div><strong>Approval required</strong><span>{approval.reason ?? approval.method}</span></div>{approval.command && <pre>$ {approval.command}</pre>}<div className="approval-actions">{approval.availableDecisions.map((decision) => <button className={decision === "decline" || decision === "cancel" ? "danger" : ""} key={decision} onClick={() => void resolve(approval, decision)}>{decision}</button>)}</div></div>;
}

export default function App() {
  const store = useCodexStore(); const [query, setQuery] = useState(""); const [input, setInput] = useState(""); const [sending, setSending] = useState(false);
  useEffect(() => { void store.loadThreads(); store.connect(); return () => useCodexStore.getState().eventSource?.close(); }, []);
  const filtered = useMemo(() => store.threads.filter((thread) => `${thread.name ?? ""} ${thread.preview} ${thread.cwd}`.toLowerCase().includes(query.toLowerCase())), [store.threads, query]);
  const activeRunning = store.active?.turns.some((turn) => turn.status === "inProgress") ?? false;
  async function send() { if (!input.trim() || sending) return; const value = input; setInput(""); setSending(true); try { await store.send(value); } catch (error) { useCodexStore.setState({ error: error instanceof Error ? error.message : "Unable to send" }); setInput(value); } finally { setSending(false); } }
  async function createThread() { const thread = await api.createThread(); await store.loadThreads(); await store.selectThread(thread.id); }
  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="logo">C</span><div><b>Codex Web</b><small>Native threads</small></div><i className={store.connection} title={store.connection} /></div><button className="new-thread" onClick={() => void createThread()}>+ New thread</button><input className="search" placeholder="Search threads" value={query} onChange={(event) => setQuery(event.target.value)} /><nav>{filtered.map((thread) => <button key={thread.id} className={`thread-item ${store.active?.id === thread.id ? "active" : ""}`} onClick={() => void store.selectThread(thread.id)}><b>{thread.name ?? (thread.preview || "Untitled thread")}</b><span>{thread.cwd}</span></button>)}</nav>{store.nextCursor && <button className="load-more" onClick={() => void store.loadThreads(store.nextCursor)}>Load more</button>}</aside>
    <section className="workspace">{store.error && <div className="error-banner">{store.error}<button onClick={() => useCodexStore.setState({ error: undefined })}>×</button></div>}{store.active ? <><header className="thread-header"><div><h1>{store.active.name ?? (store.active.preview || "Untitled thread")}</h1><span>{store.active.cwd}</span></div><div><button onClick={() => { const name = prompt("Thread name", store.active?.name); if (name && store.active) void api.rename(store.active.id, name).then(() => store.refresh()); }}>Rename</button><button onClick={() => store.active && void api.archive(store.active.id).then(() => store.loadThreads())}>Archive</button></div></header><div className="content-scroll"><AssistantThread turns={store.active.turns} /><Activity turns={store.active.turns} /></div>{store.approvals.filter((item) => item.threadId === store.active?.id).map((item) => <ApprovalCard key={item.requestId} approval={item} />)}<div className="composer"><textarea aria-label="Ask Codex" placeholder="Ask Codex…" value={input} disabled={activeRunning} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} />{activeRunning ? <button className="stop" onClick={() => void store.interrupt()}>Stop</button> : <button disabled={!input.trim() || sending} onClick={() => void send()}>Send</button>}</div></> : <div className="empty"><div className="logo large">C</div><h1>Continue your Codex work</h1><p>Select a native CLI thread or start a new one.</p></div>}</section>
  </main>;
}

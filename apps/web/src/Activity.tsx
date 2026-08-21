import type { UiItem, UiTurn } from "@codex-web/protocol";

function ActivityItem({ item }: { item: UiItem }) {
  if (item.type === "reasoning") return <details className="activity reasoning"><summary>Reasoning</summary><div>{[...item.summary, ...item.content].join("\n") || "No displayable reasoning"}</div></details>;
  if (item.type === "commandExecution") return <section className="activity"><header><span>Command</span><b>{item.status}</b></header><pre><code>$ {item.command}</code>{item.output && `\n\n${item.output}`}</pre><footer>{item.cwd}{item.exitCode !== undefined && ` · exit ${item.exitCode}`}</footer></section>;
  if (item.type === "fileChange") return <section className="activity"><header><span>File changes</span><b>{item.status}</b></header>{item.changes.map((change) => <div key={change.path}><strong>{change.path}</strong><pre className="diff">{change.diff}</pre></div>)}</section>;
  if (item.type === "unknown") return <details className="activity"><summary>Unsupported Codex item · {item.codexType}</summary>{item.raw !== undefined && <pre>{JSON.stringify(item.raw, null, 2)}</pre>}</details>;
  return null;
}
export function Activity({ turns }: { turns: UiTurn[] }) {
  const items = turns.flatMap((turn) => turn.items).filter((item) => item.type !== "userMessage" && item.type !== "agentMessage");
  if (!items.length) return null;
  return <div className="activity-list"><h3>Agent activity</h3>{items.map((item) => <ActivityItem key={item.id} item={item} />)}</div>;
}

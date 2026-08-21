import type { ApprovalDto, ThreadDetail, ThreadListDto } from "@codex-web/protocol";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
  return body as T;
}
export const api = {
  threads: (cursor?: string) => request<ThreadListDto>(`/api/threads?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  thread: (id: string) => request<ThreadDetail>(`/api/threads/${encodeURIComponent(id)}`),
  createThread: (cwd?: string) => request<ThreadDetail>("/api/threads", { method: "POST", body: JSON.stringify({ cwd }) }),
  rename: (id: string, name: string) => request(`/api/threads/${encodeURIComponent(id)}/name`, { method: "PATCH", body: JSON.stringify({ name }) }),
  archive: (id: string) => request(`/api/threads/${encodeURIComponent(id)}/archive`, { method: "POST" }),
  startTurn: (id: string, input: string) => request<{ turnId: string }>(`/api/threads/${encodeURIComponent(id)}/turns`, { method: "POST", body: JSON.stringify({ input }) }),
  interrupt: (id: string, turnId: string) => request(`/api/threads/${encodeURIComponent(id)}/turns/${encodeURIComponent(turnId)}/interrupt`, { method: "POST" }),
  approve: (approval: ApprovalDto, decision: string) => request(`/api/approvals/${encodeURIComponent(approval.requestId)}`, { method: "POST", body: JSON.stringify({ decision }) }),
};

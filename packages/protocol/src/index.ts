export interface ThreadSummary { id: string; name?: string; preview: string; cwd: string; archived: boolean; status: string; createdAt: number; updatedAt: number; }
export interface UserMessageItem { type: "userMessage"; id: string; text: string; }
export interface AgentMessageItem { type: "agentMessage"; id: string; text: string; }
export interface ReasoningItem { type: "reasoning"; id: string; summary: string[]; content: string[]; }
export interface CommandExecutionItem { type: "commandExecution"; id: string; command: string; cwd: string; output?: string; exitCode?: number; status: string; }
export interface FileChangeItem { type: "fileChange"; id: string; changes: Array<{ path: string; diff: string; kind: string }>; status: string; }
export interface UnknownItem { type: "unknown"; id: string; codexType: string; raw?: unknown; }
export type UiItem = UserMessageItem | AgentMessageItem | ReasoningItem | CommandExecutionItem | FileChangeItem | UnknownItem;
export interface UiTurn { id: string; status: string; items: UiItem[]; }
export interface ThreadDetail extends ThreadSummary { turns: UiTurn[]; }
export interface ThreadListDto { data: ThreadSummary[]; nextCursor?: string; }
export interface CodexInfoDto { connected: boolean; codexVersion: string; platform: string; transport: "stdio"; }
export interface ServerEvent { seq: number; threadId?: string; type: string; payload: unknown; }
export interface ApprovalDto { requestId: string; method: string; threadId?: string; turnId?: string; itemId?: string; reason?: string; command?: string; cwd?: string; availableDecisions: string[]; expiresAt: number; }
export interface StartTurnDto { input: string; }
export interface StartTurnResponseDto { turnId: string; }

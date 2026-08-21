#!/usr/bin/env node
import { createInterface } from "node:readline";

if (process.argv.includes("--version")) {
  console.log("codex-cli 0.147.0-fake");
  process.exit(0);
}

const thread = {
  id: "019fake-thread",
  sessionId: "019fake-session",
  forkedFromId: null,
  parentThreadId: null,
  preview: "Inspect the repository",
  ephemeral: false,
  section: null,
  sectionEnteredAt: null,
  modelProvider: "openai",
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_100,
  recencyAt: 1_700_000_100,
  status: { type: "idle" },
  path: null,
  cwd: "/workspace/project",
  cliVersion: "0.147.0",
  source: "cli",
  threadSource: null,
  agentNickname: null,
  agentRole: null,
  gitInfo: null,
  name: "Fake thread",
  turns: [],
};

function send(message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
}

let initialized = false;
let resumed = false;
let newThreadStarted = false;
let newThreadMaterialized = false;
createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); }
  catch { return; }

  if (request.method === "initialize") {
    send({ id: request.id, result: { userAgent: "fake-codex/0.1", codexHome: "/fake/.codex", platformFamily: "unix", platformOs: "linux" } });
  } else if (request.method === "initialized") {
    initialized = true;
  } else if (!initialized) {
    send({ id: request.id, error: { code: -32002, message: "Not initialized" } });
  } else if (request.method === "thread/list") {
    const data = [{ ...thread, turns: [] }];
    if (newThreadMaterialized) data.unshift({ ...thread, id: "019new-thread", name: null, preview: "First message", turns: [] });
    send({ id: request.id, result: { data, nextCursor: null, backwardsCursor: null } });
  } else if (request.method === "thread/read") {
    if (request.params?.threadId === "019new-thread" && !newThreadMaterialized) send({ id: request.id, error: { code: -32602, message: "thread 019new-thread is not materialized yet; includeTurns is unavailable before first user message" } });
    else if (request.params?.threadId !== thread.id && request.params?.threadId !== "019new-thread") send({ id: request.id, error: { code: -32602, message: "Unknown thread" } });
    else {
      const isNew = request.params.threadId === "019new-thread";
      const items = isNew ? [{ type: "userMessage", id: "user-new", content: [{ type: "text", text: "First message", text_elements: [] }] }] : [];
      send({ id: request.id, result: { thread: { ...thread, id: request.params.threadId, name: isNew ? null : thread.name, preview: isNew ? "First message" : thread.preview, turns: request.params.includeTurns ? [{ id: isNew ? "turn-new" : "turn-1", items, itemsView: "full", status: "completed", error: null, startedAt: 1, completedAt: 2, durationMs: 1000 }] : [] } } });
    }
  } else if (request.method === "thread/start") {
    newThreadStarted = true;
    newThreadMaterialized = false;
    send({ id: request.id, result: { thread: { ...thread, id: "019new-thread" } } });
  } else if (request.method === "thread/resume") {
    resumed = true; send({ id: request.id, result: { thread } });
  } else if (request.method === "turn/start") {
    const isNew = request.params?.threadId === "019new-thread";
    if ((!isNew && !resumed) || (isNew && !newThreadStarted)) send({ id: request.id, error: { code: -32002, message: "Thread not loaded" } });
    else {
      if (isNew) newThreadMaterialized = true;
      const turn = { id: isNew ? "turn-new" : "turn-active", items: [], itemsView: "full", status: "inProgress", error: null, startedAt: 3, completedAt: null, durationMs: null };
      send({ id: request.id, result: { turn } });
      send({ method: "turn/started", params: { threadId: request.params.threadId, turn } });
      if (request.params.input?.[0]?.text !== "hold") send({ method: "turn/completed", params: { threadId: request.params.threadId, turn: { ...turn, status: "completed" } } });
    }
  } else if (request.method === "turn/interrupt" || request.method === "thread/name/set" || request.method === "thread/archive" || request.method === "thread/unarchive") {
    send({ id: request.id, result: {} });
  } else {
    send({ id: request.id, error: { code: -32601, message: "Method not found" } });
  }
});

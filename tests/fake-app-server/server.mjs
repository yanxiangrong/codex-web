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
    send({ id: request.id, result: { data: [{ ...thread, turns: [] }], nextCursor: null, backwardsCursor: null } });
  } else if (request.method === "thread/read") {
    if (request.params?.threadId !== thread.id) send({ id: request.id, error: { code: -32602, message: "Unknown thread" } });
    else send({ id: request.id, result: { thread: { ...thread, turns: request.params.includeTurns ? [{ id: "turn-1", items: [], itemsView: "full", status: "completed", error: null, startedAt: 1, completedAt: 2, durationMs: 1000 }] : [] } } });
  } else if (request.method === "thread/start") {
    send({ id: request.id, result: { thread: { ...thread, id: "019new-thread" } } });
  } else if (request.method === "thread/resume") {
    resumed = true; send({ id: request.id, result: { thread } });
  } else if (request.method === "turn/start") {
    if (!resumed) send({ id: request.id, error: { code: -32002, message: "Thread not resumed" } });
    else {
      const turn = { id: "turn-active", items: [], itemsView: "full", status: "inProgress", error: null, startedAt: 3, completedAt: null, durationMs: null };
      send({ id: request.id, result: { turn } });
      send({ method: "turn/started", params: { threadId: thread.id, turn } });
      if (request.params.input?.[0]?.text !== "hold") send({ method: "turn/completed", params: { threadId: thread.id, turn: { ...turn, status: "completed" } } });
    }
  } else if (request.method === "turn/interrupt" || request.method === "thread/name/set" || request.method === "thread/archive" || request.method === "thread/unarchive") {
    send({ id: request.id, result: {} });
  } else {
    send({ id: request.id, error: { code: -32601, message: "Method not found" } });
  }
});

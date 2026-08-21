import Fastify from "fastify";
import type { CodexClient } from "@codex-web/codex-client";
import { mapThread, mapThreadList } from "./mapper.js";
import { EventBroadcaster } from "./events.js";
import { ApprovalCoordinator } from "./approvals.js";
import { ActiveTurnError, SessionCoordinator } from "./sessions.js";

export function createApp(client: CodexClient, events = new EventBroadcaster(), codexVersion = "unknown") {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
  const sessions = new SessionCoordinator(client);
  const approvals = new ApprovalCoordinator(client, events);
  client.on("notification", (method, payload) => {
    const params = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const threadId = typeof params.threadId === "string" ? params.threadId : undefined;
    const turn = params.turn && typeof params.turn === "object" ? params.turn as Record<string, unknown> : undefined;
    const turnId = typeof params.turnId === "string" ? params.turnId : typeof turn?.id === "string" ? turn.id : undefined;
    if (method === "turn/completed" && threadId) sessions.complete(threadId, turnId);
    events.publish(`codex.${method.replaceAll("/", ".")}`, payload, threadId);
  });
  client.on("request", (id, method, params) => approvals.handleRequest(id, method, params));
  client.on("exit", () => { approvals.denyAll(); events.publish("codex.connection.closed", {}); });
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff"); reply.header("X-Frame-Options", "DENY"); reply.header("Referrer-Policy", "no-referrer");
  });
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (origin && host && origin !== `http://${host}` && origin !== `https://${host}`) return reply.code(403).send({ error: "Cross-origin requests are denied" });
  });
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/codex/info", async () => ({ connected: client.connected, codexVersion, platform: client.info?.platformOs ?? process.platform, transport: "stdio" }));
  app.get("/api/threads", async (request) => {
    const query = request.query as { cursor?: string; limit?: string };
    const limit = query.limit ? Number(query.limit) : undefined;
    return mapThreadList(await client.listThreads({ cursor: query.cursor, limit: Number.isFinite(limit) ? limit : undefined }));
  });
  app.get<{ Params: { id: string } }>("/api/threads/:id", async (request, reply) => {
    try { return mapThread(await client.readThread(request.params.id)); }
    catch (error) { return reply.code(502).send({ error: error instanceof Error ? error.message : "Unable to read thread" }); }
  });
  app.post("/api/threads", async (request, reply) => {
    const body = request.body as { cwd?: string } | undefined;
    const thread = await client.startThread({ cwd: body?.cwd });
    sessions.markLoaded(thread.id);
    return reply.code(201).send(mapThread(thread));
  });
  app.patch<{ Params: { id: string } }>("/api/threads/:id/name", async (request) => {
    const body = request.body as { name?: unknown };
    if (typeof body?.name !== "string" || !body.name.trim()) throw new Error("A non-empty name is required");
    await client.renameThread(request.params.id, body.name.trim()); return { ok: true };
  });
  app.post<{ Params: { id: string } }>("/api/threads/:id/archive", async (request) => { await client.archiveThread(request.params.id); return { ok: true }; });
  app.post<{ Params: { id: string } }>("/api/threads/:id/unarchive", async (request) => { await client.unarchiveThread(request.params.id); return { ok: true }; });
  app.post<{ Params: { id: string } }>("/api/threads/:id/turns", async (request, reply) => {
    const body = request.body as { input?: unknown };
    if (typeof body?.input !== "string" || !body.input.trim()) return reply.code(400).send({ error: "Input is required" });
    try { const turn = await sessions.startTurn(request.params.id, body.input); return reply.code(202).send({ turnId: turn.id }); }
    catch (error) { if (error instanceof ActiveTurnError) return reply.code(409).send({ error: "A turn is already active" }); throw error; }
  });
  app.post<{ Params: { id: string; turnId: string } }>("/api/threads/:id/turns/:turnId/interrupt", async (request) => {
    await client.interruptTurn(request.params.id, request.params.turnId); return { ok: true };
  });
  app.post<{ Params: { requestId: string } }>("/api/approvals/:requestId", async (request, reply) => {
    const body = request.body as { decision?: unknown };
    if (typeof body?.decision !== "string" || !approvals.resolve(request.params.requestId, body.decision)) return reply.code(404).send({ error: "Approval is missing, expired, or decision is invalid" });
    return { ok: true };
  });
  app.get("/api/events", async (request, reply) => {
    const query = request.query as { threadId?: string };
    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    const unsubscribe = events.subscribe(reply.raw, query.threadId);
    request.raw.once("close", unsubscribe);
  });
  app.addHook("onClose", async () => approvals.denyAll());
  return app;
}

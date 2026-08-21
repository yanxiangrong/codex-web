import { CodexClient } from "@codex-web/codex-client";
import { createApp } from "./app.js";
import { EventBroadcaster } from "./events.js";
import fastifyStatic from "@fastify/static";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const client = new CodexClient();
await client.start();
const codexBin = process.env.CODEX_BIN ?? "codex";
const codexVersion = await promisify(execFile)(codexBin, ["--version"]).then(({ stdout }) => stdout.trim()).catch(() => "unknown");
const events = new EventBroadcaster();
const app = createApp(client, events, codexVersion);
const webRoot = fileURLToPath(new URL("../../web/dist", import.meta.url));
try { await access(webRoot); await app.register(fastifyStatic, { root: webRoot, wildcard: false }); app.get("/*", async (_request, reply) => reply.sendFile("index.html")); } catch { /* Development uses the Vite server. */ }
await app.listen({ host: process.env.HOST ?? "127.0.0.1", port: Number(process.env.PORT ?? 3001) });
let shuttingDown = false;
let restartAttempt = 0;
client.on("exit", () => {
  if (shuttingDown) return;
  const retry = async () => {
    if (shuttingDown || client.connected) return;
    try { await client.start(); restartAttempt = 0; events.publish("codex.connection.ready", {}); }
    catch { restartAttempt += 1; setTimeout(() => void retry(), Math.min(30_000, 1_000 * 2 ** restartAttempt)); }
  };
  setTimeout(() => void retry(), 1_000);
});
async function shutdown() { shuttingDown = true; await app.close(); await client.stop(); }
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

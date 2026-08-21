import { CodexClient } from "./client.js";

const client = new CodexClient();
client.on("stderr", (text) => process.stderr.write(text));

try {
  await client.start();
  const page = await client.listThreads();
  console.log(`Found ${page.data.length} Codex threads\n`);
  for (const thread of page.data) console.log(`${thread.id}\t${thread.name ?? thread.preview ?? ""}`);
  const requestedId = process.argv.slice(2).find((argument) => argument !== "--");
  if (requestedId) {
    const thread = await client.readThread(requestedId);
    console.log(`\nThread ${thread.id}: ${thread.turns.length} turn(s)`);
    console.log(JSON.stringify(thread, null, 2));
  }
} finally {
  await client.stop();
}

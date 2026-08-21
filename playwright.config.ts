import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 20_000,
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: [
    { command: "CODEX_BIN=$PWD/tests/fake-app-server/server.mjs PORT=3001 pnpm --filter @codex-web/server dev", url: "http://127.0.0.1:3001/api/health", reuseExistingServer: true },
    { command: "pnpm --filter @codex-web/web dev", url: "http://127.0.0.1:3000", reuseExistingServer: true },
  ],
});

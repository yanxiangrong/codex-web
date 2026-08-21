# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS build
WORKDIR /src
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm typecheck && pnpm test && pnpm build

FROM node:24-bookworm-slim AS runtime
ARG CODEX_VERSION=0.147.0
LABEL org.opencontainers.image.source="https://github.com/yanxiangrong/codex-web" \
      org.opencontainers.image.description="Browser client for native Codex CLI threads" \
      org.opencontainers.image.licenses="Apache-2.0"
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    HOME=/home/codex \
    CODEX_HOME=/home/codex/.codex \
    CODEX_BIN=codex
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git gosu procps ripgrep \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global "@openai/codex@${CODEX_VERSION}" \
    && corepack enable && corepack prepare pnpm@11.18.0 --activate \
    && usermod --login codex --home /home/codex node \
    && groupmod --new-name codex node \
    && mkdir -p /opt/codex-web /workspace /home/codex/.codex \
    && chown -R codex:codex /workspace /home/codex
WORKDIR /workspace
COPY --from=build /src/node_modules /opt/codex-web/node_modules
COPY --from=build /src/package.json /src/pnpm-lock.yaml /src/pnpm-workspace.yaml /opt/codex-web/
COPY --from=build /src/apps/server/package.json /opt/codex-web/apps/server/package.json
COPY --from=build /src/apps/server/node_modules /opt/codex-web/apps/server/node_modules
COPY --from=build /src/apps/server/dist /opt/codex-web/apps/server/dist
COPY --from=build /src/apps/web/dist /opt/codex-web/apps/web/dist
COPY --from=build /src/packages/codex-client/package.json /opt/codex-web/packages/codex-client/package.json
COPY --from=build /src/packages/codex-client/dist /opt/codex-web/packages/codex-client/dist
COPY --from=build /src/packages/protocol/package.json /opt/codex-web/packages/protocol/package.json
COPY --from=build /src/packages/protocol/dist /opt/codex-web/packages/protocol/dist
COPY docker/entrypoint.sh /usr/local/bin/codex-web-entrypoint
RUN chmod 0755 /usr/local/bin/codex-web-entrypoint
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=4 CMD curl --fail --silent http://127.0.0.1:3001/api/health >/dev/null || exit 1
ENTRYPOINT ["codex-web-entrypoint"]
CMD ["node", "/opt/codex-web/apps/server/dist/main.js"]

# Codex Web — Architecture & Implementation Plan

## 1. 项目目标

Codex Web 是一个开源的、浏览器可访问的 Codex Client。

核心目标：

> 在浏览器中查看、恢复并继续 Codex CLI 创建的原生 Thread，同时完整保留 Codex 的执行、文件修改、Reasoning、Approval 和 Streaming 能力。

底层直接使用官方：

```bash
codex app-server
```

作为 Codex Runtime。

前端使用：

```text
assistant-ui
React
```

构建聊天和 Agent UI。

### 最重要的架构原则

**Codex 是唯一的 Session / Thread Source of Truth。**

项目禁止建立第二套 Conversation Database。

也就是说：

```text
Codex CLI
     │
     ├──────────────┐
     │              │
     ▼              ▼
~/.codex       codex app-server
                     │
                     ▼
                  Codex Web
```

Codex CLI 与 Codex Web 操作的是同一个 Codex Thread。

用户应该能够：

```text
Terminal
  ↓
codex
  ↓
创建 Thread A
  ↓
退出 CLI

Browser
  ↓
Codex Web
  ↓
找到 Thread A
  ↓
继续工作

Terminal
  ↓
codex resume Thread-A
  ↓
继续同一 Session
```

不能复制 Session，不能导入 Session，也不能维护两个相互同步的会话数据库。

---

# 2. 非目标

v0.1 不实现以下内容：

- 不直接调用 OpenAI Responses API。
- 不重新实现 Codex Agent。
- 不解析或修改 `~/.codex/sessions/*.jsonl`。
- 不直接修改 Codex SQLite。
- 不保存聊天 transcript 到自己的数据库。
- 不 fork Codex。
- 不 fork assistant-ui。
- 不实现 OpenGUI compatibility。
- 不实现完整 IDE。
- 不实现 Monaco Editor。
- 不实现 Web Terminal。
- 不实现 Git GUI。
- 不依赖 Codex app-server experimental API。
- 不使用 Codex app-server experimental WebSocket transport。

这些功能以后可以独立增加，但不能阻塞 MVP。

---

# 3. 技术架构

推荐架构：

```text
┌──────────────────────────────────────────────┐
│                   Browser                    │
│                                              │
│ React + assistant-ui                         │
│                                              │
│ ThreadList                                   │
│ Messages                                     │
│ Reasoning                                    │
│ Command UI                                   │
│ FileChange UI                                │
│ Approval UI                                  │
└───────────────────────┬──────────────────────┘
                        │
                  REST + SSE
                        │
                        ▼
┌──────────────────────────────────────────────┐
│              Codex Web Server                │
│                                              │
│ Fastify / Node.js                            │
│                                              │
│ API Layer                                    │
│ Session Coordinator                          │
│ Approval Coordinator                         │
│ Codex Event Mapper                           │
│                                              │
│              CodexClient                     │
└───────────────────────┬──────────────────────┘
                        │
                  stdio JSONL
                   JSON-RPC 2.0
                        │
                        ▼
┌──────────────────────────────────────────────┐
│            codex app-server                  │
│                                              │
│ Thread                                       │
│ Turn                                         │
│ Item                                         │
│ Model                                        │
│ Tool execution                               │
│ File editing                                 │
│ Sandbox                                      │
│ Approval                                     │
│ MCP                                          │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
                    ~/.codex
```

`codex app-server` 官方协议本身就是为 Codex VS Code extension 这类 rich interface 服务的，支持双向 JSON-RPC；稳定 transport 是 stdio JSONL，而 WebSocket transport 当前仍被官方标记为 experimental / unsupported。

因此：

```text
Browser → Codex app-server
```

是禁止的。

必须是：

```text
Browser
   ↓
Codex Web Server
   ↓
stdio
   ↓
codex app-server
```

---

# 4. 为什么浏览器层使用 REST + SSE

第一版不需要额外引入 WebSocket。

客户端命令：

```text
Browser → REST → Server
```

Codex Streaming：

```text
app-server → Server → SSE → Browser
```

Approval：

```text
app-server
    ↓
Server
    ↓ SSE
Browser

Browser
    ↓ REST
Server
    ↓ JSON-RPC response
app-server
```

优势：

- 实现简单。
- 反向代理配置简单。
- 浏览器自动支持 reconnect。
- 不需要维护 WebSocket heartbeat。
- 不依赖 app-server experimental WebSocket。
- 页面刷新后可以先重新 `thread/read`，再重新建立 SSE。

SSE 不能成为状态源。

断线重连以后：

```text
thread/read
    ↓
重新构造完整状态
    ↓
重新监听实时 Events
```

Codex 始终是 authoritative state。

---

# 5. Monorepo 结构

推荐：

```text
codex-web/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── codex/
│   │   │   ├── assistant/
│   │   │   └── pages/
│   │   └── package.json
│   │
│   └── server/
│       ├── src/
│       │   ├── api/
│       │   ├── codex/
│       │   ├── events/
│       │   └── approvals/
│       └── package.json
│
├── packages/
│   ├── codex-client/
│   │   ├── src/
│   │   │   ├── process.ts
│   │   │   ├── rpc-client.ts
│   │   │   ├── client.ts
│   │   │   └── generated/
│   │   └── package.json
│   │
│   ├── protocol/
│   │   └── src/
│   │
│   └── assistant-runtime/
│       └── src/
│
├── tests/
│   ├── fake-app-server/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── architecture.md
│   ├── protocol.md
│   ├── testing.md
│   └── deployment.md
│
├── pnpm-workspace.yaml
└── package.json
```

使用 TypeScript。

建议使用：

```text
pnpm workspace
Vite + React
Fastify
assistant-ui
Zustand
Vitest
Playwright
```

Web 与 Server 开发时分别运行。

生产构建可以让 Fastify 直接提供：

```text
apps/web/dist
```

最终只暴露一个 HTTP 端口。

---

# 6. assistant-ui 的职责

assistant-ui 只是 Renderer / Interaction Framework。

它不拥有 Codex Session。

当前 `assistant-ui` 明确支持 `ExternalStoreRuntime`，用于后端或外部 store 自己拥有 message/state 的场景；同时它也提供外部 Thread List 适配机制。

第一版使用：

```text
ExternalStoreRuntime
+
Zustand
```

而不是让 assistant-ui 自己管理 conversation state。

结构：

```text
Codex Thread
     ↓
Codex Web normalized state
     ↓
Zustand
     ↓
ExternalStoreRuntime
     ↓
assistant-ui
```

assistant-ui 当前只是依赖。

禁止：

```text
Codex client
    ↓
直接大量使用 assistant-ui internal types
```

必须隔离为：

```text
Codex
   ↓
Internal Protocol
   ↓
assistant-runtime
   ↓
assistant-ui
```

这样未来 assistant-ui 大改甚至被替换时，Codex Client 无需重写。

---

# 7. 内部数据模型

项目自己维护一套很薄的 UI Projection 类型。

这些类型不是持久化格式。

例如：

```ts
export interface ThreadSummary {
  id: string;
  name?: string;
  cwd?: string;
  archived: boolean;
  status?: string;
}

export type UiItem =
  | UserMessageItem
  | AgentMessageItem
  | ReasoningItem
  | CommandExecutionItem
  | FileChangeItem
  | ApprovalItem
  | ErrorItem
  | UnknownItem;
```

注意：

```text
UiItem ≠ Codex persisted Item
```

它只是 UI projection。

页面刷新以后可以全部从：

```text
thread/read
```

重新生成。

---

# 8. CodexClient

`packages/codex-client` 必须与 Web UI 完全无关。

公开 API 类似：

```ts
interface CodexClient {
  start(): Promise<void>;
  stop(): Promise<void>;

  listThreads(options?: ListOptions): Promise<ThreadList>;
  readThread(id: string): Promise<Thread>;

  startThread(options: StartThreadOptions): Promise<Thread>;
  resumeThread(id: string): Promise<Thread>;

  startTurn(
    threadId: string,
    input: UserInput[],
  ): Promise<Turn>;

  interruptTurn(
    threadId: string,
    turnId: string,
  ): Promise<void>;

  renameThread(
    threadId: string,
    name: string,
  ): Promise<void>;

  archiveThread(
    threadId: string,
  ): Promise<void>;

  onEvent(handler: CodexEventHandler): Unsubscribe;

  onRequest(handler: CodexRequestHandler): Unsubscribe;
}
```

这一层只理解 Codex Protocol。

---

# 9. App Server 生命周期

Server 启动时：

```text
Codex Web Server
      ↓
检查 codex binary
      ↓
codex --version
      ↓
spawn codex app-server --stdio
      ↓
initialize
      ↓
initialized
      ↓
ready
```

官方要求每个连接首先完成：

```text
initialize
initialized
```

否则其它 request 会被拒绝。

使用：

```bash
codex app-server --stdio
```

不要启动 TCP listener。

---

# 10. Codex Protocol Schema

不要手写完整 Codex TypeScript Protocol。

使用官方命令：

```bash
codex app-server generate-ts --out packages/codex-client/src/generated
```

Codex 官方说明生成出来的 schema 与执行该命令的 Codex 版本匹配。

仓库中记录：

```text
TESTED_CODEX_VERSION
```

例如：

```text
0.x.y
```

运行时读取：

```bash
codex --version
```

如果与测试版本不同：

- Compatible version：正常工作。
- 新版本：显示 warning。
- 协议 handshake 失败：阻止启动并给出明确错误。

第一版只使用 Stable API。

不要：

```text
capabilities.experimentalApi = true
```

---

# 11. JSON-RPC Client

实现一个通用 request registry：

```text
request
   ↓
allocate id
   ↓
pendingRequests[id] = Promise
   ↓
stdin write JSONL
```

接收到：

```text
{id,result}
```

以后 resolve。

必须支持：

- 多个并发 request。
- request timeout。
- process exit。
- malformed payload。
- unknown event。
- server initiated request。
- graceful shutdown。
- retryable overload。

官方 app-server 在 request ingress overloaded 时可能返回：

```text
-32001
Server overloaded; retry later.
```

应实现 bounded exponential backoff + jitter。

---

# 12. Thread 生命周期

Thread List：

```text
GET /api/threads
        ↓
thread/list
```

读取：

```text
GET /api/threads/:id
        ↓
thread/read
includeTurns=true
```

打开 Thread 时：

**不要立即 resume。**

只：

```text
thread/read
```

用户真正发送消息时：

```text
thread/resume
       ↓
turn/start
```

官方明确区分：

```text
thread/read
```

只读取已有 Thread；

```text
thread/resume
```

重新加载已有 Thread，使后续 `turn/start` 继续追加。

---

# 13. Turn 生命周期

发送消息：

```text
POST /api/threads/:threadId/turns
```

Server：

```text
ensure thread resumed
        ↓
turn/start
        ↓
return turn id
```

随后通过 SSE：

```text
turn/started
item/started
item/agentMessage/delta
...
item/completed
turn/completed
```

Codex 官方 Turn API 本身就是这种事件模型。

---

# 14. 第一版支持的 Item

MVP 必须支持：

```text
userMessage
agentMessage
reasoning
commandExecution
fileChange
```

未知 Item 必须：

```text
保留原始 type
+
显示 Generic Item
```

不能 crash。

例如：

```text
Unsupported Codex item

type: xxx
```

开发模式可以展开 raw JSON。

这样 Codex 新增 Item 时 Web UI 不会直接失效。

---

# 15. Agent Message Streaming

对于：

```text
item/agentMessage/delta
```

必须按：

```text
threadId
turnId
itemId
```

定位消息。

禁止简单：

```text
messages[last] += delta
```

否则并行/异步事件会产生错误。

内部 store：

```text
Map<itemId, UiItem>
```

按 ID update。

---

# 16. Reasoning

Reasoning 独立显示。

例如：

```text
▶ Reasoning
  Inspecting repository structure...
```

不要和最终 assistant message 合并。

如果 Codex 没有提供可展示的 reasoning 内容，则不要尝试自行构造。

---

# 17. Command Execution

Codex 自己执行 command。

Web 只负责展示：

```text
Command

$ pnpm test

cwd:
/workspace/project

Output:
...

Exit code: 0
```

禁止 Web Server 自己执行这些 command。

---

# 18. File Change

显示：

```text
File changed

src/server.ts

+ ...
- ...
```

第一版不需要 Monaco。

普通 diff viewer 即可。

Codex 仍然负责真正文件修改。

---

# 19. Approval

这是最重要的安全模块之一。

App Server 可以向 Client 发起 server-initiated JSON-RPC request，例如 command/file approval。

流程：

```text
Codex
 ↓
app-server
 ↓
CodexClient
 ↓
ApprovalCoordinator
 ↓ SSE
Browser
 ↓
Allow / Deny
 ↓ REST
ApprovalCoordinator
 ↓
JSON-RPC response
 ↓
app-server
 ↓
Codex 继续执行
```

绝对禁止默认 auto approve。

规则：

```text
Unknown approval → DENY

Timeout → DENY

No connected browser → DENY

Malformed approval → DENY
```

UI 必须使用 app-server 提供的：

```text
availableDecisions
```

而不是假设永远只有：

```text
Allow
Deny
```

Codex 官方实现中存在 command/file approval server request；当前 Python SDK 还曾有一个默认 auto-accept approval 的公开问题，因此这个项目应明确采用 fail-closed 策略。

---

# 20. Interrupt

支持：

```text
Stop generating
```

映射：

```text
turn/interrupt
```

必须记录：

```text
threadId
turnId
```

完成后等待：

```text
turn/completed
status = interrupted
```

而不是前端自己假装停止。

---

# 21. Concurrent Access

v0.1 不承诺下面的场景：

```text
Codex CLI
和
Codex Web

同时向同一个 Thread 发送消息
```

支持的是：

```text
CLI → Web → CLI
```

这种 handoff。

Server 对每个 Thread 建立 mutex：

```text
threadId → active turn
```

如果已有 active regular turn：

```text
POST turn
→ HTTP 409
```

后续可以支持：

```text
turn/steer
```

但不是 MVP 阻塞项。

---

# 22. Backend HTTP API

建议第一版：

```text
GET    /api/health

GET    /api/codex/info

GET    /api/threads
GET    /api/threads/:id

POST   /api/threads
PATCH  /api/threads/:id/name

POST   /api/threads/:id/archive
POST   /api/threads/:id/unarchive

POST   /api/threads/:id/turns
POST   /api/threads/:id/turns/:turnId/interrupt

GET    /api/events?threadId=xxx

POST   /api/approvals/:requestId
```

DTO 使用：

```text
packages/protocol
```

定义。

不要把 Codex generated types 直接暴露给 Browser。

---

# 23. SSE Protocol

每个 event：

```ts
interface ServerEvent {
  seq: number;
  threadId?: string;
  type: string;
  payload: unknown;
}
```

例如：

```text
codex.item.started
codex.item.delta
codex.item.completed
codex.turn.started
codex.turn.completed
codex.approval.requested
codex.thread.updated
```

SSE 断开时：

客户端不要试图通过 replay 重建全部 Session。

重新：

```text
GET /api/threads/:id
```

然后继续订阅。

---

# 24. Frontend Store

使用 Zustand。

例如：

```ts
interface CodexWebStore {
  threads: ThreadSummary[];

  activeThreadId?: string;

  items: Record<string, UiItem>;

  turns: Record<string, UiTurn>;

  approvals: Record<string, Approval>;

  connection:
    | "connected"
    | "reconnecting"
    | "offline";
}
```

Store 只做 cache。

刷新页面以后可以丢弃。

---

# 25. assistant-ui Adapter

单独建立：

```text
packages/assistant-runtime
```

这一层才可以 import：

```text
@assistant-ui/react
```

Codex Client 不允许 import assistant-ui。

职责：

```text
UiItem
  ↓
assistant-ui Message

Codex status
  ↓
assistant-ui running state

User composer
  ↓
POST turn

Stop
  ↓
turn interrupt
```

assistant-ui 当前提供 ExternalStoreRuntime，适合这种由外部 store 完全控制消息与回调的场景。

---

# 26. assistant-ui 版本策略

不 fork assistant-ui。

当前开发开始时应固定经过测试的精确版本。

截至本方案编写时：

```text
@assistant-ui/react 0.15.11
```

并且该 package 使用 MIT License。

不要：

```json
"@assistant-ui/react": "^0.15.11"
```

第一版建议：

```json
"@assistant-ui/react": "0.15.11"
```

并提交：

```text
pnpm-lock.yaml
```

之后通过 Renovate/Dependabot PR 更新。

升级流程：

```text
dependency update PR
       ↓
typecheck
       ↓
unit
       ↓
integration
       ↓
Playwright
       ↓
manual smoke
       ↓
merge
```

---

# 27. Codex 版本策略

不要自动 bundle 私有修改版 Codex。

默认：

```text
CODEX_BIN=codex
```

允许配置：

```text
CODEX_BIN=/path/to/codex
CODEX_HOME=/path/to/.codex
```

启动时：

```text
codex --version
```

显示在：

```text
Settings / About
```

例如：

```text
Codex Web: 0.1.0
Codex CLI: x.y.z
assistant-ui: 0.15.11
```

---

# 28. 安全边界

这个项目不是普通 Chat UI。

它可以通过 Codex：

```text
执行 shell
修改源码
访问 workspace
调用 MCP
访问 network
```

因此默认：

```text
host = 127.0.0.1
```

不要默认：

```text
0.0.0.0
```

如需远程访问，推荐：

```text
Browser
   ↓ HTTPS
Caddy / nginx / Traefik
   ↓
Authentication
   ↓
Codex Web
```

App Server stdio 永远不能直接暴露到公网。

---

# 29. 安全要求

必须：

- Approval fail closed。
- 不打印 OAuth credential。
- 不打印 `auth.json`。
- 不把 CODEX_HOME 暴露为 HTTP static files。
- 不允许浏览器指定任意 executable path。
- 默认拒绝跨 Origin。
- Command 输出必须安全 escape。
- Markdown HTML 默认 sanitize。
- File diff 不允许直接执行 HTML/JS。
- Production 默认 secure headers。
- 禁止未经授权的 Web 页面连接已有 Codex Thread。

---

# 30. Docker

Docker 是第二阶段部署目标。

概念：

```text
container
├── codex-web
├── codex binary
├── /home/user/.codex   ← bind mount
└── /workspace          ← bind mount
```

例如：

```text
$HOME/.codex → /home/codex/.codex
/projects    → /workspace
```

容器必须尽量使用宿主用户相同 UID/GID，避免 Codex 修改文件后产生 root-owned 文件。

不要使用：

```text
docker.sock
```

除非用户明确配置。

---

# 31. Testing Strategy

测试分为五层。

## Level 1 — Unit Tests

不启动真实 Codex。

测试：

### JSON-RPC

- request id generation
- concurrent request
- response routing
- error response
- timeout
- process close
- invalid JSON
- unknown message

### JSONL

测试：

```text
一行完整
多行
fragmented stdout chunk
UTF-8
空行
malformed line
```

### Event Mapper

Fixture：

```text
agentMessage
reasoning
commandExecution
fileChange
unknown item
```

验证：

```text
Codex Event → UiItem
```

### Approval

测试：

```text
allow
deny
timeout
disconnect
unknown request
duplicate response
```

其中：

```text
timeout
disconnect
unknown
```

必须 fail closed。

---

# 32. Fake App Server

实现一个：

```text
tests/fake-app-server/
```

它表现得像：

```bash
codex app-server --stdio
```

但完全不调用模型。

支持：

```text
initialize
thread/list
thread/read
thread/start
thread/resume
turn/start
turn/interrupt
```

同时能够发送：

```text
agentMessage delta
reasoning
commandExecution
fileChange
approval request
turn completed
```

CI 绝大多数集成测试使用 Fake App Server。

优势：

- deterministic
- 不需要 ChatGPT login
- 不需要 API key
- 不消耗模型额度
- 不依赖网络
- 可以测试异常状态

---

# 33. Contract Tests

测试真实：

```text
CodexClient
     ↕
Fake App Server
```

验证协议行为。

场景：

```text
initialize
list threads
read existing thread
resume thread
start turn
stream output
approve command
deny command
interrupt
server crash
server restart
```

---

# 34. Real App Server Integration Tests

增加：

```bash
pnpm test:codex-live
```

默认 CI 不运行。

只有：

```text
CODEX_LIVE_TEST=1
```

时运行。

至少测试：

```text
spawn codex app-server
initialize
thread/list
thread/read
```

可选测试：

```text
resume existing thread
start real turn
```

因为这可能需要登录并消耗 Codex 使用额度，所以不能作为默认 CI。

Codex 官方仓库本身提供了 app-server test client，并包含 Thread rejoin / resume 相关测试流程，可作为协议行为的重要参考。

---

# 35. Browser E2E

使用 Playwright。

浏览器连接：

```text
Web
 ↓
Server
 ↓
Fake App Server
```

必须覆盖：

### Thread

- 显示 thread list
- pagination
- 打开 existing thread
- 切换 thread
- 页面 refresh
- rename
- archive

### Chat

- 发送 message
- streaming message
- multiple deltas
- completion

### Reasoning

- expandable reasoning

### Command

- command start
- output streaming
- exit code

### File

- file change
- diff rendering

### Approval

- approval appears
- allow
- deny
- timeout

### Control

- stop generation
- disconnected server
- reconnect

---

# 36. Protocol Drift Test

建立一个 GitHub Actions scheduled workflow：

```text
Codex Compatibility
```

例如每周运行。

流程：

```text
install latest Codex
       ↓
codex app-server generate-ts
       ↓
run protocol smoke tests
       ↓
report incompatibility
```

这个 workflow 不调用模型。

如果 latest Codex 发生 stable protocol breaking change：

创建：

```text
compatibility failure
```

而不是等用户报告。

---

# 37. assistant-ui Upgrade Test

使用 Renovate 或 Dependabot。

assistant-ui 每次升级必须创建 PR，不允许自动 merge。

PR 必须跑：

```text
lint
typecheck
unit
fake integration
Playwright
```

这样 assistant-ui 只是可替换 Renderer，不成为项目架构核心。

assistant-ui 的架构文档本身也把 backend integration / protocol layer 与 UI/runtime 分开定义。

---

# 38. CI

GitHub Actions：

```text
PR

pnpm install --frozen-lockfile

pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
```

另外：

```text
weekly-codex-compat.yml
dependency-update.yml
release.yml
```

---

# 39. Compatibility

v0.1 优先：

```text
Linux
macOS
```

Windows 可以 Best Effort。

原因不是 Web UI 本身，而是 app-server 在 Windows 上当前仍存在一些 sandbox / commandExecution 相关的上游问题报告，因此第一阶段不要把 Windows 完整一致性作为 release blocker。

---

# 40. Logging

使用结构化日志。

必须区分：

```text
server
codex-process
rpc
thread
turn
approval
sse
```

开发环境可以：

```text
LOG_LEVEL=debug
```

Production 默认：

```text
info
```

不要默认记录完整用户 prompt、文件内容或 authentication 信息。

---

# 41. Diagnostics

实现：

```text
GET /api/codex/info
```

返回：

```json
{
  "connected": true,
  "codexVersion": "...",
  "codexHome": "...",
  "platform": "...",
  "transport": "stdio"
}
```

敏感路径根据配置决定是否显示。

---

# 42. UI 第一版布局

建议：

```text
┌──────────────────┬────────────────────────────────────┐
│ Threads          │ Project / Thread                   │
│                  │                                    │
│ Search           │ User                               │
│                  │ Fix websocket reconnect            │
│ project-a        │                                    │
│  Thread A        │ Codex                              │
│  Thread B        │ I'll inspect the implementation.   │
│                  │                                    │
│ project-b        │ ▶ Reasoning                        │
│  Thread C        │                                    │
│                  │ $ pnpm test                        │
│                  │ ✓ 48 tests passed                  │
│                  │                                    │
│                  │ src/socket.ts                      │
│                  │ + reconnect()                      │
│                  │                                    │
│                  │ ┌───────────────────────────────┐  │
│                  │ │ Ask Codex...                  │  │
│                  │ └───────────────────────────────┘  │
└──────────────────┴────────────────────────────────────┘
```

先把 Coding Agent 信息展示正确。

不要优先做视觉特效。

---

# 43. MVP Definition of Done

v0.1 达到以下条件才能发布：

- 可以启动真实 `codex app-server`。
- 可以完成 initialize。
- 可以显示 Codex CLI 已有 Threads。
- 可以打开已有 Thread。
- 可以读取完整历史。
- 可以 resume。
- 可以继续发送 Prompt。
- CLI 后续可以 `codex resume` 同一个 Thread。
- Agent message 可以 streaming。
- Reasoning 可以展示。
- Command execution 可以展示。
- Command output 可以 streaming。
- File change 可以展示。
- Approval 可以 Allow / Deny。
- Approval 默认 fail closed。
- 可以 Interrupt Turn。
- app-server crash 后 UI 给出明确状态。
- Unknown Item 不会 crash。
- 页面刷新后 Session 不丢失，因为 Session 本来就在 Codex。
- Unit + Integration + E2E 全部通过。

---

# 44. Milestone 0 — Protocol Spike

不要先写漂亮 UI。

首先实现：

```text
packages/codex-client
```

创建 CLI：

```bash
pnpm codex-web debug threads
```

能够：

```text
spawn app-server
initialize
thread/list
thread/read
```

完成以后再开始 UI。

### Acceptance

能够打印：

```text
Found 23 Codex threads

019...
019...
019...
```

并能读取其中一个历史 Thread。

---

# 45. Milestone 1 — Browser Read Only

实现：

```text
Fastify
REST
React
assistant-ui
ThreadList
thread/read
```

做到：

```text
浏览器
→ 查看 CLI Threads
→ 打开历史会话
```

此阶段不允许发送 Prompt。

---

# 46. Milestone 2 — Turn + Streaming

加入：

```text
thread/resume
turn/start
SSE
agentMessage
reasoning
turn/completed
turn/interrupt
```

此时已经可以进行基本 Codex 工作。

---

# 47. Milestone 3 — Coding Agent Events

加入：

```text
commandExecution
fileChange
approval
```

此版本开始真正具备 Coding Agent GUI 能力。

---

# 48. Milestone 4 — Reliability

实现：

```text
app-server restart
RPC timeout
SSE reconnect
thread mutex
unknown event fallback
version detection
structured logging
```

---

# 49. Milestone 5 — Open Source Release

GitHub 必须包含：

```text
README.md
LICENSE
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md

docs/
  architecture.md
  deployment.md
  protocol.md
  testing.md
```

README 必须明确：

```text
This project is an independent open-source client for OpenAI Codex.

It is not affiliated with or endorsed by OpenAI.
```

---

# 50. License

assistant-ui 的 `@assistant-ui/react` 当前为 MIT License。

OpenAI Codex repository 为 Apache-2.0。

项目推荐：

```text
Apache-2.0
```

原因：

- permissive
- 与 Codex license 一致
- 有明确 patent grant

同时增加：

```text
THIRD_PARTY_NOTICES.md
```

列明主要第三方组件。

如果项目不复制 Codex 源码，只通过 CLI/app-server protocol 通信，则 Codex 仍然只是外部依赖。

---

# 51. 必须遵守的实现约束

Codex 开发过程中必须遵守：

### MUST

```text
Codex = source of truth

app-server = runtime

assistant-ui = renderer

CodexClient independent from assistant-ui

stdio JSONL only

stable Codex APIs only

approval fail closed

unknown events handled gracefully
```

### MUST NOT

```text
DO NOT parse ~/.codex/sessions

DO NOT modify Codex SQLite

DO NOT create another conversation database

DO NOT fork assistant-ui

DO NOT fork Codex

DO NOT auto approve commands

DO NOT expose app-server directly to browser

DO NOT use experimental app-server websocket

DO NOT tightly couple Codex protocol types to UI components
```

---

# 52. 关键参考实现

开发前必须阅读：

## OpenAI Codex

### app-server Protocol

Repository：

```text
openai/codex
```

文件：

```text
codex-rs/app-server/README.md
```

这是项目最重要的协议文档。

它定义：

```text
initialize
Thread
Turn
Item
thread/list
thread/read
thread/resume
turn/start
turn/interrupt
events
approvals
schema generation
```

### Protocol Schema

```text
codex-rs/app-server-protocol/
```

特别关注：

```text
schema/typescript/v2/
```

### Test Client

```text
codex-rs/app-server-test-client/
```

用于理解：

```text
thread resume
rejoin
raw traffic
protocol smoke testing
```

### Python SDK

```text
sdk/python/src/openai_codex/client.py
```

可以参考：

```text
process lifecycle
stdio
RPC request handling
server request handling
```

但不能复制它当前的默认 approval 行为；本项目必须 fail closed。

---

# 53. assistant-ui 参考

Repository：

```text
assistant-ui/assistant-ui
```

重点文档：

```text
/docs/runtimes/custom/overview
/docs/runtimes/custom/external-store
/docs/runtimes/concepts/threads
/docs/runtimes/concepts/architecture
```

优先研究：

```text
ExternalStoreRuntime
ExternalStoreThreadListAdapter
ThreadList
Message rendering
Tool UI
```

当前 assistant-ui 自己也已经存在 `react-opencode` 这类 coding-agent integration，这说明它的 runtime abstraction 本身适合外部 coding-agent server；但本项目不要依赖该 experimental integration，只参考架构思想。

---

# 54. 开发优先级

Codex 收到这份方案后，第一轮不要实现完整项目。

第一轮任务严格限定为：

```text
1. 初始化 monorepo
2. 创建 packages/codex-client
3. spawn codex app-server --stdio
4. JSONL reader/writer
5. JSON-RPC request registry
6. initialize handshake
7. thread/list
8. thread/read
9. 编写 Fake App Server
10. 为上述功能写 Unit / Integration Tests
```

第一轮完成后必须验证：

```bash
pnpm test
```

然后提供一个：

```bash
pnpm debug:threads
```

输出本机真实 Codex Thread List。

**在这个里程碑完成以前，不要实现 UI。**

---

# 55. 第二轮任务

只有 Milestone 0 通过后：

```text
1. apps/server
2. GET /api/threads
3. GET /api/threads/:id
4. apps/web
5. assistant-ui
6. Zustand
7. ExternalStoreRuntime
8. Thread List
9. Historical Thread rendering
10. Playwright read-only E2E
```

仍然不要实现写操作。

---

# 56. 第三轮任务

Read-only UI 验证正确以后：

```text
thread/resume
turn/start
SSE
streaming
interrupt
```

---

# 57. 第四轮任务

最后实现高风险部分：

```text
commandExecution
fileChange
approval
```

并首先写测试，再实现 UI。

---

# 58. 最终设计原则

这个项目本质上不是：

```text
另一个 Codex
```

而是：

```text
Codex Browser Client
```

最理想的代码规模应该表现为：

```text
Codex负责 Agent
assistant-ui负责通用 UI
Codex Web负责协议桥接和 Coding Agent UX
```

如果某个功能 Codex app-server 已经提供：

**不要重新实现。**

如果某个状态 Codex 已经持久化：

**不要再保存一份。**

如果 assistant-ui 已经有通用 UI primitive：

**优先组合，不 fork。**

长期目标是：

```text
Codex 升级
→ Adapter 小幅升级

assistant-ui 升级
→ Renderer 小幅升级

Codex Web Core
→ 基本稳定
```

这才是项目长期可维护的核心。
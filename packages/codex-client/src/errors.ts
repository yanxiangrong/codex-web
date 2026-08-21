export class RpcError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export class RpcTimeoutError extends Error {
  constructor(readonly method: string, readonly timeoutMs: number) {
    super(`RPC request ${method} timed out after ${timeoutMs}ms`);
    this.name = "RpcTimeoutError";
  }
}

export class RpcClosedError extends Error {
  constructor(message = "RPC transport closed") {
    super(message);
    this.name = "RpcClosedError";
  }
}

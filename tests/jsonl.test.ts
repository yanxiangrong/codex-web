import { describe, expect, it, vi } from "vitest";
import { JsonlReader, encodeJsonl } from "../packages/codex-client/src/jsonl.js";

describe("JsonlReader", () => {
  it("reads complete, fragmented, multibyte, and empty lines", () => {
    const reader = new JsonlReader();
    const values: unknown[] = [];
    reader.on("value", (value) => values.push(value));
    const bytes = new TextEncoder().encode('{"text":"你好"}\n\n{"n":2}\r\n');
    reader.push(bytes.slice(0, 11));
    reader.push(bytes.slice(11));
    expect(values).toEqual([{ text: "你好" }, { n: 2 }]);
  });

  it("reports malformed lines and continues", () => {
    const reader = new JsonlReader();
    const malformed = vi.fn();
    const values: unknown[] = [];
    reader.on("malformed", malformed);
    reader.on("value", (value) => values.push(value));
    reader.push(Buffer.from("nope\n{\"ok\":true}\n"));
    expect(malformed).toHaveBeenCalledOnce();
    expect(values).toEqual([{ ok: true }]);
  });

  it("encodes one JSON value per line", () => {
    expect(encodeJsonl({ ok: true })).toBe('{"ok":true}\n');
  });
});

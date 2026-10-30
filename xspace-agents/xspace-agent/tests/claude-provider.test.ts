// SPDX-License-Identifier: Apache-2.0

/**
 * The Claude provider through the installed @anthropic-ai/sdk, over HTTP.
 *
 * The SDK sends each request to a local server (ANTHROPIC_BASE_URL) that
 * records it and answers with a Messages API event stream, so the test sees
 * the exact headers and body the SDK puts on the wire.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";

interface Recorded {
  path: string | undefined;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

const RETIRED_MODELS = new Set(["claude-sonnet-4-20250514"]);
const requests: Recorded[] = [];
let server: Server;

function sse(events: Array<Record<string, unknown>>): string {
  return events.map((e) => `event: ${e["type"]}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

function reply(model: string, chunks: string[]): string {
  return sse([
    {
      type: "message_start",
      message: {
        id: "msg_local", type: "message", role: "assistant", model, content: [],
        stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 },
      },
    },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    ...chunks.map((text) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } })),
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: chunks.length } },
    { type: "message_stop" },
  ]);
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      requests.push({ path: req.url, headers: req.headers, body });
      if (RETIRED_MODELS.has(String(body["model"]))) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: `model: ${body["model"]}` } }));
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(reply(String(body["model"]), ["Hey", " there"]));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  vi.stubEnv("ANTHROPIC_BASE_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-local");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise((resolve) => server.close(resolve));
});

async function provider(env: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  const { ClaudeLLM } = await import("../src/providers/llm/claude.js");
  return new ClaudeLLM();
}

async function collect(stream: AsyncGenerator<string, void, unknown>): Promise<string> {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}

describe("ClaudeLLM", () => {
  it("streams a reply from the default model", async () => {
    const llm = await provider();
    expect(await collect(llm.streamResponse(0, "hi", "Be brief."))).toBe("Hey there");

    const { path, body } = requests.at(-1)!;
    expect(path).toBe("/v1/messages");
    expect(RETIRED_MODELS.has(String(body["model"]))).toBe(false);
    expect(body["stream"]).toBe(true);
    expect(body["system"]).toBe("Be brief.");
    expect(body["messages"]).toEqual([{ role: "user", content: "hi" }]);
  });

  it("sends API version 2026-10-21 with the key as a bearer token and no sampling params", async () => {
    const llm = await provider();
    await collect(llm.streamResponse(0, "hi", "Be brief."));

    const { headers, body } = requests.at(-1)!;
    expect(headers["anthropic-version"]).toBe("2026-10-21");
    expect(headers["authorization"]).toBe("Bearer sk-ant-local");
    for (const field of ["temperature", "top_p", "top_k"]) expect(body).not.toHaveProperty(field);
  });

  it("uses CLAUDE_MODEL when it is set", async () => {
    const llm = await provider({ CLAUDE_MODEL: "claude-opus-5-5" });
    await collect(llm.streamResponse(1, "hi", "Be brief."));
    expect(requests.at(-1)!.body["model"]).toBe("claude-opus-5-5");
    vi.stubEnv("CLAUDE_MODEL", "");
  });

  it("sends earlier turns back as history", async () => {
    const llm = await provider();
    await collect(llm.streamResponse(0, "first", "Be brief."));
    await collect(llm.streamResponse(0, "second", "Be brief."));
    expect(requests.at(-1)!.body["messages"]).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "Hey there" },
      { role: "user", content: "second" },
    ]);
  });
});

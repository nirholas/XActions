// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

// Drives the real @anthropic-ai/sdk against a local HTTP server that speaks the
// Messages SSE protocol, so no network or paid API is involved.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import http from "node:http"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

describe("ClaudeProvider (real SDK over local SSE server)", () => {
  let server
  let requests
  const savedEnv = {}

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const chunks = []
      req.on("data", (c) => chunks.push(c))
      req.on("end", () => {
        requests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
        })
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" })
        res.write(sse("message_start", {
          type: "message_start",
          message: {
            id: "msg_test", type: "message", role: "assistant", model: "claude-sonnet-5-5",
            content: [], stop_reason: null, stop_sequence: null,
            usage: { input_tokens: 5, output_tokens: 0 }
          }
        }))
        res.write(sse("content_block_start", {
          type: "content_block_start", index: 0, content_block: { type: "text", text: "" }
        }))
        for (const text of ["Hello", ", ", "world"]) {
          res.write(sse("content_block_delta", {
            type: "content_block_delta", index: 0, delta: { type: "text_delta", text }
          }))
        }
        res.write(sse("content_block_stop", { type: "content_block_stop", index: 0 }))
        res.write(sse("message_delta", {
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: 3 }
        }))
        res.write(sse("message_stop", { type: "message_stop" }))
        res.end()
      })
    })
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  })

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  beforeEach(() => {
    requests = []
    for (const key of ["ANTHROPIC_BASE_URL", "ANTHROPIC_API_KEY", "CLAUDE_MODEL"]) {
      if (!(key in savedEnv)) savedEnv[key] = process.env[key]
    }
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`
    process.env.ANTHROPIC_API_KEY = "test-key"
    delete process.env.CLAUDE_MODEL
    return () => {
      for (const [k, v] of Object.entries(savedEnv)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
    }
  })

  async function collect(provider, ...args) {
    const out = []
    for await (const text of provider.streamResponse(...args)) out.push(text)
    return out
  }

  it("streams text deltas and posts a well-formed request to /v1/messages", async () => {
    const ClaudeProvider = require("../../../providers/claude")
    const provider = new ClaudeProvider()

    const deltas = await collect(provider, "agent-1", "Say hi", "You are a test agent.", "room-1")

    expect(deltas).toEqual(["Hello", ", ", "world"])
    expect(requests).toHaveLength(1)

    const [req] = requests
    expect(req.method).toBe("POST")
    expect(req.url.split("?")[0]).toBe("/v1/messages")
    expect(req.body.model).toBe("claude-sonnet-5-5")
    expect(req.body.stream).toBe(true)
    expect(req.body.system).toBe("You are a test agent.")
    expect(req.body.messages).toEqual([{ role: "user", content: "Say hi" }])
    expect(req.body.max_tokens).toBeGreaterThan(0)
  })

  it("sends no sampling parameters, which the 2026-10-21 API version rejects", async () => {
    const ClaudeProvider = require("../../../providers/claude")
    await collect(new ClaudeProvider(), "agent-1", "hi", "sys", "room-2")

    const body = requests[0].body
    for (const param of ["temperature", "top_p", "top_k"]) {
      expect(body).not.toHaveProperty(param)
    }
  })

  it("authenticates with the configured key and records the reply in history", async () => {
    const ClaudeProvider = require("../../../providers/claude")
    const provider = new ClaudeProvider()
    await collect(provider, "agent-1", "first", "sys", "room-3")
    await collect(provider, "agent-1", "second", "sys", "room-3")

    const auth = requests[0].headers.authorization
    const xApiKey = requests[0].headers["x-api-key"]
    expect(auth === "Bearer test-key" || xApiKey === "test-key").toBe(true)

    expect(requests[1].body.messages).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "Hello, world" },
      { role: "user", content: "second" }
    ])
  })

  it("honours CLAUDE_MODEL and defaults to a current model otherwise", async () => {
    const ClaudeProvider = require("../../../providers/claude")
    expect(new ClaudeProvider().model).toBe("claude-sonnet-5-5")

    process.env.CLAUDE_MODEL = "claude-opus-5-5"
    const provider = new ClaudeProvider()
    await collect(provider, "agent-1", "hi", "sys", "room-4")
    expect(requests[0].body.model).toBe("claude-opus-5-5")
  })
})

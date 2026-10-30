// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

import { createRequire } from "module"
import OpenAIChatProvider from "../../../providers/openai-chat.js"
import openaiStreamChunks from "../../fixtures/provider-responses/openai-stream-chunks.json" assert { type: "json" }
import openaiError429 from "../../fixtures/provider-responses/openai-error-429.json" assert { type: "json" }

/**
 * Build an async-iterable that simulates an axios responseType:"stream".
 * Each element in `lines` is yielded as a Buffer, mirroring how Node
 * streams emit chunks.
 */
function makeSSEStream(...lines) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const line of lines) {
        yield Buffer.from(line)
      }
    }
  }
}

/** Combine all fixture chunks into a single stream response */
function makeFixtureStream(chunks) {
  return makeSSEStream(...chunks)
}

// The providers load axios with CommonJS require(), which vi.mock() does not intercept
// (an axios mock here would silently leave the real client in place and hit the
// network). Load the same CommonJS instance the providers use and stub its post().
const axios = createRequire(import.meta.url)("axios")

describe("OpenAI Chat Provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("axios.post called without a test stub")
    })
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("OPENAI_MODEL", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  describe("initialization", () => {
    it("creates provider with valid config", () => {
      const provider = new OpenAIChatProvider()
      expect(provider).toBeDefined()
      expect(provider.name).toBe("openai-chat")
      expect(provider.type).toBe("socket")
    })

    it("uses default model when OPENAI_MODEL is not set", () => {
      const provider = new OpenAIChatProvider()
      const config = provider.getApiConfig()
      expect(config.model).toBe("gpt-4o-mini")
    })

    it("uses custom model when OPENAI_MODEL is set", () => {
      vi.stubEnv("OPENAI_MODEL", "gpt-4-turbo")
      const provider = new OpenAIChatProvider()
      const config = provider.getApiConfig()
      expect(config.model).toBe("gpt-4-turbo")
    })

    it("sets Authorization header using OPENAI_API_KEY", () => {
      vi.stubEnv("OPENAI_API_KEY", "sk-my-key")
      const provider = new OpenAIChatProvider()
      const { headers } = provider.getApiConfig()
      expect(headers.Authorization).toBe("Bearer sk-my-key")
    })

    it("points to the OpenAI chat completions URL", () => {
      const provider = new OpenAIChatProvider()
      const { url } = provider.getApiConfig()
      expect(url).toBe("https://api.openai.com/v1/chat/completions")
    })
  })

  // ---------------------------------------------------------------------------
  // streamResponse()
  // ---------------------------------------------------------------------------
  describe("streamResponse()", () => {
    it("streams response chunks for a simple prompt", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeFixtureStream(openaiStreamChunks)
      })

      const provider = new OpenAIChatProvider()
      const chunks = []
      for await (const chunk of provider.streamResponse("agent1", "Hello", "Be helpful", "room1")) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(["Hello", "!", " How", " can I", " help?"])
    })

    it("includes system prompt in the request messages", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("agent1", "Hi", "You are a pirate", "room1")) { /* drain */ }

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      const messages = body.messages
      expect(messages[0]).toEqual({ role: "system", content: "You are a pirate" })
    })

    it("includes user message in the request", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("agent1", "What is the weather?", "Be helpful", "room1")) { /* drain */ }

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      const userMsg = body.messages.find(m => m.role === "user")
      expect(userMsg?.content).toBe("What is the weather?")
    })

    it("requests SSE streaming (stream: true)", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("a1", "q", "sys", "r1")) { /* drain */ }

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      expect(body.stream).toBe(true)
    })

    it("respects max_tokens setting", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("a1", "q", "sys", "r1")) { /* drain */ }

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      expect(body.max_tokens).toBe(300)
    })

    it("handles empty response stream (no chunks yielded)", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      const chunks = []
      for await (const chunk of provider.streamResponse("a1", "hi", "sys", "r1")) {
        chunks.push(chunk)
      }
      expect(chunks).toHaveLength(0)
    })

    it("handles API error (401 Unauthorized)", async () => {
      const err = Object.assign(new Error("Request failed with status code 401"), {
        response: { status: 401, data: { error: { message: "Invalid API key" } } }
      })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIChatProvider()
      await expect(async () => {
        for await (const _ of provider.streamResponse("a1", "hi", "sys", "r1")) { /* drain */ }
      }).rejects.toThrow("Request failed with status code 401")
    })

    it("handles API error (429 rate limit)", async () => {
      const err = Object.assign(new Error("Request failed with status code 429"), {
        response: { status: 429, data: openaiError429 }
      })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIChatProvider()
      await expect(async () => {
        for await (const _ of provider.streamResponse("a1", "hi", "sys", "r1")) { /* drain */ }
      }).rejects.toThrow()
    })

    it("handles API error (500 server error)", async () => {
      const err = Object.assign(new Error("Request failed with status code 500"), {
        response: { status: 500, data: { error: { message: "Internal server error" } } }
      })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIChatProvider()
      await expect(async () => {
        for await (const _ of provider.streamResponse("a1", "hi", "sys", "r1")) { /* drain */ }
      }).rejects.toThrow()
    })

    it("handles network timeout", async () => {
      const err = Object.assign(new Error("timeout of 0ms exceeded"), { code: "ECONNABORTED" })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIChatProvider()
      await expect(async () => {
        for await (const _ of provider.streamResponse("a1", "hi", "sys", "r1")) { /* drain */ }
      }).rejects.toThrow()
    })

    it("silently skips malformed stream chunks", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream(
          "data: THIS IS NOT JSON\n",
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n',
          "data: [DONE]\n"
        )
      })

      const provider = new OpenAIChatProvider()
      const chunks = []
      for await (const chunk of provider.streamResponse("a1", "hi", "sys", "r1")) {
        chunks.push(chunk)
      }
      expect(chunks).toEqual(["ok"])
    })

    it("skips chunks with null/empty delta content", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream(
          'data: {"choices":[{"delta":{"role":"assistant"},"finish_reason":null}]}\n',
          'data: {"choices":[{"delta":{"content":"real"},"finish_reason":null}]}\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n',
          "data: [DONE]\n"
        )
      })

      const provider = new OpenAIChatProvider()
      const chunks = []
      for await (const chunk of provider.streamResponse("a1", "hi", "sys", "r1")) {
        chunks.push(chunk)
      }
      expect(chunks).toEqual(["real"])
    })
  })

  // ---------------------------------------------------------------------------
  // Message history
  // ---------------------------------------------------------------------------
  describe("message history", () => {
    it("maintains per-agent history across calls", async () => {
      vi.mocked(axios.post)
        .mockResolvedValueOnce({ data: makeSSEStream('data: {"choices":[{"delta":{"content":"first"}}]}\n', "data: [DONE]\n") })
        .mockResolvedValueOnce({ data: makeSSEStream("data: [DONE]\n") })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("agent1", "message one", "sys", "room1")) { /* drain */ }
      for await (const _ of provider.streamResponse("agent1", "message two", "sys", "room1")) { /* drain */ }

      const [, body] = vi.mocked(axios.post).mock.calls[1]
      const userMessages = body.messages.filter(m => m.role === "user")
      expect(userMessages).toHaveLength(2)
      expect(userMessages[0].content).toBe("message one")
      expect(userMessages[1].content).toBe("message two")
    })

    it("separates history by room ID", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("agent1", "room-a message", "sys", "roomA")) { /* drain */ }
      for await (const _ of provider.streamResponse("agent1", "room-b message", "sys", "roomB")) { /* drain */ }

      // roomB's first request should only contain its own message, not roomA's
      const [, body] = vi.mocked(axios.post).mock.calls[1]
      const userMessages = body.messages.filter(m => m.role === "user")
      expect(userMessages).toHaveLength(1)
      expect(userMessages[0].content).toBe("room-b message")
    })

    it("trims history to maxHistory limit", async () => {
      const maxHistory = 20
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()

      // Add more messages than the limit
      for (let i = 0; i < maxHistory + 5; i++) {
        for await (const _ of provider.streamResponse("agent1", `msg ${i}`, "sys", "room1")) { /* drain */ }
      }

      const lastCall = vi.mocked(axios.post).mock.calls.at(-1)
      const [, body] = lastCall
      // History messages (user + assistant) must not exceed maxHistory
      const historyMessages = body.messages.filter(m => m.role !== "system")
      expect(historyMessages.length).toBeLessThanOrEqual(maxHistory + 1) // +1 for the current user message
    })

    it("clears history for a specific agent+room", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream('data: {"choices":[{"delta":{"content":"hi"}}]}\n', "data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("agent1", "first", "sys", "room1")) { /* drain */ }

      provider.clearHistory("agent1", "room1")

      for await (const _ of provider.streamResponse("agent1", "second", "sys", "room1")) { /* drain */ }

      const [, body] = vi.mocked(axios.post).mock.calls[1]
      const userMessages = body.messages.filter(m => m.role === "user")
      expect(userMessages).toHaveLength(1)
      expect(userMessages[0].content).toBe("second")
    })

    it("clears all history for a room via clearRoomHistory", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: makeSSEStream("data: [DONE]\n")
      })

      const provider = new OpenAIChatProvider()
      for await (const _ of provider.streamResponse("agent1", "first", "sys", "room1")) { /* drain */ }
      for await (const _ of provider.streamResponse("agent2", "first", "sys", "room1")) { /* drain */ }

      provider.clearRoomHistory("room1")

      for await (const _ of provider.streamResponse("agent1", "new msg", "sys", "room1")) { /* drain */ }

      const lastCall = vi.mocked(axios.post).mock.calls.at(-1)
      const [, body] = lastCall
      const userMessages = body.messages.filter(m => m.role === "user")
      expect(userMessages).toHaveLength(1)
      expect(userMessages[0].content).toBe("new msg")
    })
  })
})

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

import { createRequire } from "module"
import OpenAIRealtimeProvider from "../../../providers/openai-realtime.js"

// The providers load axios with CommonJS require(), which vi.mock() does not intercept
// (an axios mock here would silently leave the real client in place and hit the
// network). Load the same CommonJS instance the providers use and stub its post().
const axios = createRequire(import.meta.url)("axios")

describe("OpenAI Realtime Provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("axios.post called without a test stub")
    })
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("OPENAI_REALTIME_MODEL", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  describe("initialization", () => {
    it("creates provider with correct type and name", () => {
      const provider = new OpenAIRealtimeProvider()
      expect(provider.type).toBe("webrtc")
      expect(provider.name).toBe("openai")
    })

    it("uses default model when OPENAI_REALTIME_MODEL is not set", () => {
      const provider = new OpenAIRealtimeProvider()
      expect(provider.model).toBe("gpt-4o-realtime-preview-2024-12-17")
    })

    it("uses custom model when OPENAI_REALTIME_MODEL is set", () => {
      vi.stubEnv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-custom")
      const provider = new OpenAIRealtimeProvider()
      expect(provider.model).toBe("gpt-4o-realtime-preview-custom")
    })

    it("exposes static name and requiredEnvVars", () => {
      expect(OpenAIRealtimeProvider.name).toBe("openai")
      expect(OpenAIRealtimeProvider.requiredEnvVars).toEqual(["OPENAI_API_KEY"])
    })
  })

  // ---------------------------------------------------------------------------
  // createSession()
  // ---------------------------------------------------------------------------
  describe("createSession()", () => {
    it("calls OpenAI realtime sessions API with correct URL", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" }, model: "gpt-4o-realtime-preview-2024-12-17", voice: "verse" }
      })

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession("agent1", { agent1: "Be helpful" }, { agent1: "verse" })

      const [url] = vi.mocked(axios.post).mock.calls[0]
      expect(url).toBe("https://api.openai.com/v1/realtime/sessions")
    })

    it("sends correct request body with model, modalities, voice, and instructions", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" }, model: "gpt-4o-realtime-preview-2024-12-17", voice: "sage" }
      })

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession(
        "bob",
        { bob: "You are a friendly assistant", alice: "You are a researcher" },
        { bob: "sage", alice: "verse" }
      )

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      expect(body).toEqual({
        model: "gpt-4o-realtime-preview-2024-12-17",
        modalities: ["audio", "text"],
        voice: "sage",
        instructions: "You are a friendly assistant"
      })
    })

    it("sets Authorization header using OPENAI_API_KEY", async () => {
      vi.stubEnv("OPENAI_API_KEY", "sk-realtime-key")
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" } }
      })

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })

      const [, , config] = vi.mocked(axios.post).mock.calls[0]
      expect(config.headers.Authorization).toBe("Bearer sk-realtime-key")
      expect(config.headers["Content-Type"]).toBe("application/json")
    })

    it("returns session data from API response", async () => {
      const sessionData = {
        client_secret: { value: "ek-ephemeral-456" },
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        id: "sess_abc123"
      }
      vi.mocked(axios.post).mockResolvedValue({ data: sessionData })

      const provider = new OpenAIRealtimeProvider()
      const result = await provider.createSession("agent1", { agent1: "Be helpful" }, { agent1: "verse" })

      expect(result).toEqual(sessionData)
      expect(result.client_secret.value).toBe("ek-ephemeral-456")
    })

    it("uses custom model in the request body", async () => {
      vi.stubEnv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-custom")
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" } }
      })

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      expect(body.model).toBe("gpt-4o-realtime-preview-custom")
    })

    it("looks up voice and instructions by agentId", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" } }
      })

      const prompts = { alice: "Alice instructions", bob: "Bob instructions" }
      const voices = { alice: "shimmer", bob: "echo" }

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession("alice", prompts, voices)

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      expect(body.voice).toBe("shimmer")
      expect(body.instructions).toBe("Alice instructions")
    })

    it("handles undefined voice/instructions for agentId gracefully", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" } }
      })

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession("unknown", {}, {})

      const [, body] = vi.mocked(axios.post).mock.calls[0]
      expect(body.voice).toBeUndefined()
      expect(body.instructions).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe("error handling", () => {
    it("handles API error (401 Unauthorized)", async () => {
      const err = Object.assign(new Error("Request failed with status code 401"), {
        response: { status: 401, data: { error: { message: "Invalid API key" } } }
      })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIRealtimeProvider()
      await expect(
        provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      ).rejects.toThrow("Request failed with status code 401")
    })

    it("handles API error (429 rate limit)", async () => {
      const err = Object.assign(new Error("Request failed with status code 429"), {
        response: {
          status: 429,
          data: { error: { message: "Rate limit exceeded", type: "rate_limit_error" } }
        }
      })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIRealtimeProvider()
      await expect(
        provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      ).rejects.toThrow("429")
    })

    it("handles API error (500 server error)", async () => {
      const err = Object.assign(new Error("Request failed with status code 500"), {
        response: { status: 500, data: { error: { message: "Internal server error" } } }
      })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIRealtimeProvider()
      await expect(
        provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      ).rejects.toThrow()
    })

    it("handles network timeout", async () => {
      const err = Object.assign(new Error("timeout of 0ms exceeded"), { code: "ECONNABORTED" })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIRealtimeProvider()
      await expect(
        provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      ).rejects.toThrow("timeout")
    })

    it("handles network connection refused", async () => {
      const err = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
      vi.mocked(axios.post).mockRejectedValue(err)

      const provider = new OpenAIRealtimeProvider()
      await expect(
        provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      ).rejects.toThrow("ECONNREFUSED")
    })

    it("handles session expiry (invalid session response)", async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: null })

      const provider = new OpenAIRealtimeProvider()
      const result = await provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Multiple sessions
  // ---------------------------------------------------------------------------
  describe("multiple sessions", () => {
    it("can create sessions for different agents independently", async () => {
      vi.mocked(axios.post)
        .mockResolvedValueOnce({
          data: { client_secret: { value: "ek-bob" }, voice: "echo" }
        })
        .mockResolvedValueOnce({
          data: { client_secret: { value: "ek-alice" }, voice: "shimmer" }
        })

      const provider = new OpenAIRealtimeProvider()
      const prompts = { bob: "Bob prompt", alice: "Alice prompt" }
      const voices = { bob: "echo", alice: "shimmer" }

      const session1 = await provider.createSession("bob", prompts, voices)
      const session2 = await provider.createSession("alice", prompts, voices)

      expect(session1.client_secret.value).toBe("ek-bob")
      expect(session2.client_secret.value).toBe("ek-alice")
      expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(2)

      // Verify each call used the correct agent's voice and instructions
      const [, body1] = vi.mocked(axios.post).mock.calls[0]
      const [, body2] = vi.mocked(axios.post).mock.calls[1]
      expect(body1.voice).toBe("echo")
      expect(body1.instructions).toBe("Bob prompt")
      expect(body2.voice).toBe("shimmer")
      expect(body2.instructions).toBe("Alice prompt")
    })

    it("each session gets a fresh API call (no caching)", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { client_secret: { value: "ek-123" } }
      })

      const provider = new OpenAIRealtimeProvider()
      await provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })
      await provider.createSession("agent1", { agent1: "sys" }, { agent1: "alloy" })

      expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(2)
    })
  })
})

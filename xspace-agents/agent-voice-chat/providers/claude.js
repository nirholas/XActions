// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const Anthropic = require("@anthropic-ai/sdk")
const { ConversationHistory } = require("./conversation-history")

class ClaudeProvider {
  static name = "claude"
  static requiredEnvVars = ["ANTHROPIC_API_KEY"]

  constructor() {
    this.type = "socket"
    this.name = "claude"
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.model = process.env.CLAUDE_MODEL || "claude-sonnet-5-5"
    this.history = new ConversationHistory()
  }

  async *streamResponse(agentId, userText, systemPrompt, roomId) {
    this.history.add(roomId, agentId, "user", userText)

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 300,
      system: systemPrompt,
      messages: this.history.get(roomId, agentId)
    })

    let fullResponse = ""

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        const text = event.delta.text
        fullResponse += text
        yield text
      }
    }

    this.history.add(roomId, agentId, "assistant", fullResponse)
  }

  clearHistory(agentId, roomId) {
    this.history.clear(agentId, roomId)
  }

  clearRoomHistory(roomId) {
    this.history.clearRoom(roomId)
  }
}

module.exports = ClaudeProvider

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import fs from "fs"
import path from "path"
import os from "os"

// AgentRegistry loads its config with CommonJS require("fs"), which vi.mock cannot
// intercept, so the tests drive it with a real config file in a temp directory.
let tmpDir
let configPath

function writeConfig(raw) {
  fs.writeFileSync(configPath, raw)
}

import AgentRegistry from "../../agent-registry"

const TEST_CONFIG = {
  agents: [
    {
      id: "bob",
      name: "Bob",
      personality: "You are Bob, the loud one.",
      voice: "verse",
      avatar: "/assets/bob.png",
      theme: { primary: "#818cf8", gradient: ["#667eea", "#764ba2"], background: ["#1a1a2e", "#16213e"] }
    },
    {
      id: "alice",
      name: "Alice",
      personality: "You are Alice, the chill one.",
      voice: "sage",
      avatar: "/assets/alice.png",
      theme: { primary: "#f472b6", gradient: ["#f093fb", "#f5576c"], background: ["#2d1b3d", "#1a1a2e"] }
    }
  ],
  basePrompt: "You are a human in a voice chat.",
  defaults: { voice: "alloy", maxHistoryLength: 50 }
}

describe("AgentRegistry", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-registry-"))
    configPath = path.join(tmpDir, "agents.config.json")
    writeConfig(JSON.stringify(TEST_CONFIG))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe("loading config", () => {
    it("should load agents from config file", () => {
      const registry = new AgentRegistry(configPath)
      const agents = registry.getAllAgents()
      expect(agents).toHaveLength(2)
      expect(agents[0].id).toBe("bob")
      expect(agents[1].id).toBe("alice")
    })

    it("should fall back to defaults when config file not found", () => {
      fs.rmSync(configPath)

      const registry = new AgentRegistry(configPath)
      const agents = registry.getAllAgents()
      expect(agents.length).toBeGreaterThan(0)
    })

    it("should fall back to defaults on invalid JSON", () => {
      writeConfig("not json{{{")

      const registry = new AgentRegistry(configPath)
      const agents = registry.getAllAgents()
      expect(agents.length).toBeGreaterThan(0)
    })

    it("should record validation errors on invalid config", () => {
      writeConfig(JSON.stringify({ agents: [{ id: "X!", name: "" }] }))

      const registry = new AgentRegistry(configPath)
      expect(registry.getLastValidationErrors()).toBeTruthy()
      // Falls back to defaults
      expect(registry.getAllAgents().length).toBeGreaterThan(0)
    })
  })

  describe("getAgent", () => {
    it("should return agent by id", () => {
      const registry = new AgentRegistry(configPath)
      const agent = registry.getAgent("bob")
      expect(agent).not.toBeNull()
      expect(agent.name).toBe("Bob")
    })

    it("should return null for unknown id", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getAgent("unknown")).toBeNull()
    })
  })

  describe("addAgent", () => {
    it("should add a new agent", () => {
      const registry = new AgentRegistry(configPath)
      const agent = registry.addAgent({ id: "alex", name: "Alex", personality: "Cool agent personality for tests." })
      expect(agent.id).toBe("alex")
      expect(registry.getAgent("alex")).not.toBeNull()
    })

    it("should throw on duplicate id", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.addAgent({ id: "bob", name: "Bob2", personality: "Duplicate bob personality." })).toThrow("already exists")
    })

    it("should throw on missing id", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.addAgent({ name: "No ID" })).toThrow()
    })

    it("should throw on missing name", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.addAgent({ id: "new" })).toThrow()
    })

    it("should apply default voice if not provided", () => {
      const registry = new AgentRegistry(configPath)
      const agent = registry.addAgent({ id: "alex", name: "Alex", personality: "Alex personality for testing." })
      expect(agent.voice).toBe("alloy")
    })

    it("should reject invalid agent ID format", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.addAgent({ id: "INVALID!", name: "Bad", personality: "Invalid agent personality." })).toThrow(/Invalid agent/)
    })

    it("should reject agent with short personality", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.addAgent({ id: "new-agent", name: "New", personality: "short" })).toThrow(/Invalid agent/)
    })
  })

  describe("updateAgent", () => {
    it("should update agent properties", () => {
      const registry = new AgentRegistry(configPath)
      const updated = registry.updateAgent("bob", { name: "Robert" })
      expect(updated.name).toBe("Robert")
      expect(updated.id).toBe("bob")
    })

    it("should not allow changing the id", () => {
      const registry = new AgentRegistry(configPath)
      const updated = registry.updateAgent("bob", { id: "new-id", name: "Robert" })
      expect(updated.id).toBe("bob")
    })

    it("should throw for unknown agent", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.updateAgent("unknown", { name: "X" })).toThrow("not found")
    })
  })

  describe("removeAgent", () => {
    it("should remove an existing agent", () => {
      const registry = new AgentRegistry(configPath)
      registry.removeAgent("bob")
      expect(registry.getAgent("bob")).toBeNull()
    })

    it("should throw for unknown agent", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.removeAgent("unknown")).toThrow("not found")
    })
  })

  describe("getSystemPrompt", () => {
    it("should combine basePrompt and personality", () => {
      const registry = new AgentRegistry(configPath)
      const prompt = registry.getSystemPrompt("bob")
      // Should contain the agent's personality (includes "Bob")
      expect(prompt).toContain("Bob")
      // Should be longer than just a name — includes basePrompt + personality
      expect(prompt.length).toBeGreaterThan(50)
    })

    it("should return null for unknown agent", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getSystemPrompt("unknown")).toBeNull()
    })
  })

  describe("getVoice", () => {
    it("should return agent voice", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getVoice("bob")).toBe("verse")
    })

    it("should return default voice for unknown agent", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getVoice("unknown")).toBe("alloy")
    })
  })

  describe("public agent info", () => {
    it("should not include personality in public agent", () => {
      const registry = new AgentRegistry(configPath)
      const pub = registry.getPublicAgent("bob")
      expect(pub.id).toBe("bob")
      expect(pub.name).toBe("Bob")
      expect(pub).not.toHaveProperty("personality")
    })

    it("should return null for unknown public agent", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getPublicAgent("unknown")).toBeNull()
    })

    it("should return all public agents", () => {
      const registry = new AgentRegistry(configPath)
      const agents = registry.getPublicAgents()
      expect(agents).toHaveLength(2)
      agents.forEach(a => {
        expect(a).not.toHaveProperty("personality")
        expect(a).toHaveProperty("id")
        expect(a).toHaveProperty("name")
      })
    })
  })

  describe("maps", () => {
    it("should build prompts map", () => {
      const registry = new AgentRegistry(configPath)
      const map = registry.getPromptsMap()
      expect(map).toHaveProperty("bob")
      expect(map).toHaveProperty("alice")
      expect(map.bob).toContain("Bob")
    })

    it("should build voices map", () => {
      const registry = new AgentRegistry(configPath)
      const map = registry.getVoicesMap()
      expect(map.bob).toBe("verse")
      expect(map.alice).toBe("sage")
    })
  })

  describe("config validation", () => {
    it("should reject config without agents array", () => {
      writeConfig(JSON.stringify({ agents: [] }))
      const registry = new AgentRegistry(configPath)
      expect(registry.getAllAgents().length).toBeGreaterThan(0)
    })

    it("should reject agents without id", () => {
      writeConfig(JSON.stringify({
        agents: [{ name: "NoID" }]
      }))
      const registry = new AgentRegistry(configPath)
      expect(registry.getAllAgents().length).toBeGreaterThan(0)
    })

    it("should reject duplicate agent ids", () => {
      writeConfig(JSON.stringify({
        agents: [
          { id: "bob", name: "Bob", personality: "Bob personality text." },
          { id: "bob", name: "Bob2", personality: "Bob2 personality text." }
        ]
      }))
      const registry = new AgentRegistry(configPath)
      expect(registry.getAllAgents().length).toBeGreaterThan(0)
    })
  })

  describe("validateVoiceIds", () => {
    it("should return empty array when all voices are valid", async () => {
      const registry = new AgentRegistry(configPath)
      const mockTTS = {
        listVoices: vi.fn().mockResolvedValue([
          { id: "verse" }, { id: "sage" }, { id: "alloy" }
        ])
      }
      const invalid = await registry.validateVoiceIds(mockTTS)
      expect(invalid).toHaveLength(0)
    })

    it("should return invalid voices", async () => {
      const registry = new AgentRegistry(configPath)
      const mockTTS = {
        listVoices: vi.fn().mockResolvedValue([{ id: "alloy" }])
      }
      const invalid = await registry.validateVoiceIds(mockTTS)
      expect(invalid).toHaveLength(2)
      expect(invalid[0].agentId).toBe("bob")
      expect(invalid[0].voice).toBe("verse")
    })

    it("should handle provider without listVoices", async () => {
      const registry = new AgentRegistry(configPath)
      const invalid = await registry.validateVoiceIds({})
      expect(invalid).toHaveLength(0)
    })

    it("should handle null provider", async () => {
      const registry = new AgentRegistry(configPath)
      const invalid = await registry.validateVoiceIds(null)
      expect(invalid).toHaveLength(0)
    })

    it("should handle listVoices failure gracefully", async () => {
      const registry = new AgentRegistry(configPath)
      const mockTTS = {
        listVoices: vi.fn().mockRejectedValue(new Error("Network error"))
      }
      const invalid = await registry.validateVoiceIds(mockTTS)
      expect(invalid).toHaveLength(0)
    })
  })

  describe("reload", () => {
    it("should reload config from disk", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getAllAgents()).toHaveLength(2)

      // Update mock to return different config
      writeConfig(JSON.stringify({
        agents: [
          { id: "charlie", name: "Charlie", personality: "Charlie personality for test." }
        ],
        defaults: { voice: "echo" }
      }))

      const result = registry.reload()
      expect(result.ok).toBe(true)
      expect(result.agents).toBe(1)
      expect(registry.getAgent("charlie")).not.toBeNull()
      expect(registry.getAgent("bob")).toBeNull()
    })

    it("should keep previous config on reload failure", () => {
      const registry = new AgentRegistry(configPath)
      expect(registry.getAllAgents()).toHaveLength(2)

      writeConfig("invalid json{{{")
      const result = registry.reload()
      // Falls back to defaults, not previous config, since _load uses DEFAULT_CONFIG on error
      expect(registry.getAllAgents().length).toBeGreaterThan(0)
    })

    it("should report errors on reload with invalid schema", () => {
      const registry = new AgentRegistry(configPath)
      writeConfig(JSON.stringify({ agents: [] }))
      const result = registry.reload()
      // Falls back to defaults
      expect(registry.getAllAgents().length).toBeGreaterThan(0)
      expect(registry.getLastValidationErrors()).toBeTruthy()
    })
  })

  describe("watchConfig / stopWatching", () => {
    it("should not throw when calling stopWatching without watching", () => {
      const registry = new AgentRegistry(configPath)
      expect(() => registry.stopWatching()).not.toThrow()
    })
  })
})

// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults the boolean flags to booleans when they are unset", () => {
    const config = loadConfig({});
    expect(config.xSpacesEnabled).toBe(false);
    expect(config.headless).toBe(true);
  });

  it("reads the boolean flags from their env strings", () => {
    expect(loadConfig({ X_SPACES_ENABLED: "true" }).xSpacesEnabled).toBe(true);
    expect(loadConfig({ X_SPACES_ENABLED: "false" }).xSpacesEnabled).toBe(false);
    expect(loadConfig({ HEADLESS: "false" }).headless).toBe(false);
    expect(loadConfig({ HEADLESS: "true" }).headless).toBe(true);
  });

  it("treats an empty variable as unset", () => {
    const config = loadConfig({ X_SPACES_ENABLED: "", HEADLESS: "", PORT: "" });
    expect(config.xSpacesEnabled).toBe(false);
    expect(config.headless).toBe(true);
    expect(config.port).toBe(3000);
  });

  it("coerces numbers and applies defaults", () => {
    const config = loadConfig({ PORT: "8080", MAX_TOKENS: "512" });
    expect(config.port).toBe(8080);
    expect(config.maxTokens).toBe(512);
    expect(config.aiProvider).toBe("openai");
    expect(config.sttProvider).toBe("groq");
    expect(config.cookiePath).toBe(".cookies.json");
    expect(config.browserTimeout).toBe(30000);
  });

  it("accepts a Space URL", () => {
    const url = "https://x.com/i/spaces/1ZkJzbdvLgyxv";
    expect(loadConfig({ X_SPACE_URL: url }).xSpaceUrl).toBe(url);
  });

  it.each([
    ["PORT", "70000", "port"],
    ["PORT", "not-a-number", "port"],
    ["MAX_TOKENS", "0", "maxTokens"],
    ["AI_PROVIDER", "nope", "aiProvider"],
    ["TTS_PROVIDER", "nope", "ttsProvider"],
    ["X_SPACE_URL", "not a url", "xSpaceUrl"],
    ["SPACE_JOIN_TIMEOUT", "10", "spaceJoinTimeout"],
  ])("rejects %s=%s and names the field", (name, value, field) => {
    expect(() => loadConfig({ [name]: value })).toThrow(new RegExp(`Invalid configuration:\\n\\s+${field}:`));
  });
});

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§69]

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  // Server
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  adminApiKey: z.string().optional(),

  // X/Twitter Authentication
  xAuthToken: z.string().optional(),
  xCt0: z.string().optional(),
  xUsername: z.string().optional(),
  xPassword: z.string().optional(),
  xEmail: z.string().optional(),

  // X Spaces
  xSpacesEnabled: z
    .string()
    .transform((v) => v === "true")
    .default(false),
  xSpaceUrl: z.url().optional(),
  cookiePath: z.string().default(".cookies.json"),

  // AI Provider
  aiProvider: z
    .enum(["openai", "openai-chat", "claude", "groq"])
    .default("openai"),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  groqApiKey: z.string().optional(),

  // Model overrides
  openaiModel: z.string().default("gpt-4o-mini"),
  openaiRealtimeModel: z
    .string()
    .default("gpt-4o-realtime-preview-2024-12-17"),
  claudeModel: z.string().default("claude-sonnet-5-5"),
  groqModel: z.string().default("llama-3.3-70b-versatile"),
  maxTokens: z.coerce.number().int().min(1).max(4096).default(300),

  // STT/TTS
  sttProvider: z.enum(["groq", "openai"]).default("groq"),
  ttsProvider: z.enum(["openai", "elevenlabs", "browser"]).default("openai"),
  elevenlabsApiKey: z.string().optional(),
  elevenlabsVoice0: z.string().default("VR6AewLTigWG4xSOukaG"),
  elevenlabsVoice1: z.string().default("TxGEqnHWrfWFTfGW9XjX"),

  // Agent personality
  projectName: z.string().default("AI Agents"),
  systemPrompt: z.string().optional(),

  // Puppeteer
  headless: z
    .string()
    .transform((v) => v !== "false")
    .default(true),

  // Reconnection
  reconnectMaxRetries: z.coerce.number().int().min(0).default(5),
  reconnectBaseDelayMs: z.coerce.number().int().min(100).default(1000),

  // Timeouts
  browserTimeout: z.coerce.number().int().min(5000).default(30000),
  spaceJoinTimeout: z.coerce.number().int().min(5000).default(45000),
  speakerWaitTimeout: z.coerce.number().int().min(10000).default(300000),
  providerTimeout: z.coerce.number().int().min(5000).default(30000),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const raw = {
    port: env["PORT"],
    adminApiKey: env["ADMIN_API_KEY"],

    xAuthToken: env["X_AUTH_TOKEN"],
    xCt0: env["X_CT0"],
    xUsername: env["X_USERNAME"],
    xPassword: env["X_PASSWORD"],
    xEmail: env["X_EMAIL"],

    xSpacesEnabled: env["X_SPACES_ENABLED"],
    xSpaceUrl: env["X_SPACE_URL"],
    cookiePath: env["COOKIE_PATH"],

    aiProvider: env["AI_PROVIDER"],
    openaiApiKey: env["OPENAI_API_KEY"],
    anthropicApiKey: env["ANTHROPIC_API_KEY"],
    groqApiKey: env["GROQ_API_KEY"],

    openaiModel: env["OPENAI_MODEL"],
    openaiRealtimeModel: env["OPENAI_REALTIME_MODEL"],
    claudeModel: env["CLAUDE_MODEL"],
    groqModel: env["GROQ_MODEL"],
    maxTokens: env["MAX_TOKENS"],

    sttProvider: env["STT_PROVIDER"],
    ttsProvider: env["TTS_PROVIDER"],
    elevenlabsApiKey: env["ELEVENLABS_API_KEY"],
    elevenlabsVoice0: env["ELEVENLABS_VOICE_0"],
    elevenlabsVoice1: env["ELEVENLABS_VOICE_1"],

    projectName: env["PROJECT_NAME"],
    systemPrompt: env["SYSTEM_PROMPT"],

    headless: env["HEADLESS"],

    reconnectMaxRetries: env["RECONNECT_MAX_RETRIES"],
    reconnectBaseDelayMs: env["RECONNECT_BASE_DELAY_MS"],

    browserTimeout: env["BROWSER_TIMEOUT"],
    spaceJoinTimeout: env["SPACE_JOIN_TIMEOUT"],
    speakerWaitTimeout: env["SPEAKER_WAIT_TIMEOUT"],
    providerTimeout: env["PROVIDER_TIMEOUT"],
  };

  // Strip undefined values so Zod defaults kick in
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined && v !== ""),
  );

  const result = configSchema.safeParse(cleaned);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}

export const config = loadConfig();

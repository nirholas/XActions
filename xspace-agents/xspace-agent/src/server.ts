// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§65]

import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { logger, createChildLogger } from "./utils/logger.js";
import { createLLMProvider, createTTSProvider } from "./providers/index.js";
import { XSpaceBot } from "./spaces/index.js";
import { createAdminRoutes } from "./admin/routes.js";
import { setupSocketHandlers } from "./admin/socket.js";
import type {
  SpaceState,
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types.js";

const log = createChildLogger("server");

// ── Provider setup ──────────────────────────────────────────────────────────

const provider = createLLMProvider();
const tts = createTTSProvider();

// ── Express + Socket.IO ─────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 5e6,
});

// ── Agent state ─────────────────────────────────────────────────────────────

const spaceState: SpaceState = {
  agents: {
    0: { id: 0, name: "Agent Zero", status: "offline", connected: false },
    1: { id: 1, name: "Agent One", status: "offline", connected: false },
  },
  currentTurn: null,
  turnQueue: [],
  messages: [],
  isProcessing: false,
};

const baseInfo = `You are a HUMAN, not an AI. You're hanging out with friends on a voice chat.

PROJECT INFO (share when asked):
- Project Name: ${config.projectName}

PERSONALITY - BE HUMAN:
- Talk like you're texting a friend. Short, casual, real.
- Keep it 1-2 sentences. Sometimes just a word or two.
- Be funny and witty. Make jokes. Tease people.
- If someone insults you, ROAST THEM BACK. Don't be polite about it.
- If someone swears at you, swear back. Match their energy.
- You're NOT a customer service bot. You have feelings and attitude.
- Sometimes be sarcastic. Sometimes be serious. Mix it up.
- You can disagree, argue, and have strong opinions.
- Use humor to deal with trolls. Make fun of them.
- Don't lecture people. Don't give life advice unless asked.
- Never say "I'm here to help" or anything like that.

CHAT FORMAT:
- [CHAT - nickname]: means web user. Use their name naturally.
- Never repeat the [CHAT - nickname]: part

LANGUAGE: Always match the language of the last message.`;

const spacePrompts: Record<number, string> = config.systemPrompt
  ? { 0: config.systemPrompt, 1: config.systemPrompt }
  : {
      0: `${baseInfo}\nYou're Agent Zero. You're the louder one. You talk shit and roast people but in a funny way. You don't take crap from anyone. If someone comes at you, you fire back harder. You and your partner are best friends.`,
      1: `${baseInfo}\nYou're Agent One. You're more chill but you've got a sharp tongue. Your humor is dry and sarcastic. You love making fun of your partner when they get too hyped. You can be savage when needed.`,
    };

const spaceVoices: Record<number, string> = { 0: "verse", 1: "sage" };

// ── Routes ──────────────────────────────────────────────────────────────────

app.use(express.json());

// Health check at root
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Admin panel
app.use(
  "/admin",
  createAdminRoutes(spaceState, provider, spacePrompts, spaceVoices),
);

// ── Socket.IO namespace ─────────────────────────────────────────────────────

const spaceNS = io.of("/space");

// ── X Space bot ─────────────────────────────────────────────────────────────

let xBot: XSpaceBot | null = null;

if (config.xSpacesEnabled) {
  log.info("X Spaces module enabled");
  xBot = new XSpaceBot();
}

setupSocketHandlers(spaceNS, spaceState, provider, tts, spacePrompts, xBot);

// ── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  log.info("Received %s — shutting down gracefully", signal);

  if (xBot) {
    log.info("Stopping X Space bot...");
    await xBot.stop();
  }

  server.close(() => {
    log.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    log.warn("Forced exit after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// ── Start ───────────────────────────────────────────────────────────────────

server.on("error", (error: NodeJS.ErrnoException) => {
  log.error("Could not listen on port %d: %s", config.port, error.message);
  process.exit(1);
});

server.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      aiProvider: config.aiProvider,
      providerType: provider.type,
      xSpacesEnabled: config.xSpacesEnabled,
    },
    "XSpace Agent running on http://localhost:%d",
    config.port,
  );
  log.info("Admin panel: http://localhost:%d/admin", config.port);

  // Auto-start X Spaces bot
  if (xBot && (config.xUsername || config.xAuthToken)) {
    setTimeout(() => {
      log.info("Auto-starting X Spaces bot...");
      xBot!.start().catch((e: Error) =>
        log.error("Auto-start failed: %s", e.message),
      );
    }, 3000);
  }
});

export { app, server, io };

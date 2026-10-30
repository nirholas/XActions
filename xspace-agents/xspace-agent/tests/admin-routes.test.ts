// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeAll, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { LLMProvider, SpaceState } from "../src/types.js";

const KEY = "admin-test-key";

let app: express.Express;
let createAdminRoutes: typeof import("../src/admin/routes.js").createAdminRoutes;
const prompts: Record<number, string> = { 0: "zero", 1: "one" };

beforeAll(async () => {
  vi.stubEnv("ADMIN_API_KEY", KEY);
  vi.resetModules();
  ({ createAdminRoutes } = await import("../src/admin/routes.js"));
  app = adminApp({ type: "socket", async *streamResponse() {} });
});

function adminApp(provider: LLMProvider): express.Express {
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
  const server = express();
  server.use(express.json());
  server.use("/admin", createAdminRoutes(spaceState, provider, prompts, { 0: "verse", 1: "sage" }));
  return server;
}

describe("admin API key guard", () => {
  it.each([
    ["GET", "/admin/api/config"],
    ["GET", "/admin/api/state"],
    ["GET", "/admin/api/health"],
    ["GET", "/admin/api/session/0"],
    ["PUT", "/admin/api/prompts/0"],
  ])("rejects %s %s without the key", async (method, path) => {
    const res = await request(app)[method === "GET" ? "get" : "put"](path);
    expect(res.status).toBe(401);
  });

  it("rejects a wrong key", async () => {
    const res = await request(app).get("/admin/api/state").set("x-api-key", "nope");
    expect(res.status).toBe(401);
  });

  it("accepts the key from the header or the query", async () => {
    expect((await request(app).get("/admin/api/health").set("x-api-key", KEY)).status).toBe(200);
    expect((await request(app).get(`/admin/api/health?api_key=${KEY}`)).status).toBe(200);
  });

  it("rejects a key passed twice in the query", async () => {
    const res = await request(app).get(`/admin/api/health?api_key=${KEY}&api_key=${KEY}`);
    expect(res.status).toBe(401);
  });
});

describe("admin routes", () => {
  it("answers the session route for a valid agent", async () => {
    const res = await request(app).get("/admin/api/session/1").set("x-api-key", KEY);
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("socket");
  });

  it("rejects an agent id that is not 0 or 1", async () => {
    const res = await request(app).get("/admin/api/session/7").set("x-api-key", KEY);
    expect(res.status).toBe(400);
  });

  it("updates an agent prompt", async () => {
    const res = await request(app)
      .put("/admin/api/prompts/1")
      .set("x-api-key", KEY)
      .send({ prompt: "be brief" });
    expect(res.status).toBe(200);
    expect(prompts[1]).toBe("be brief");
  });

  it("answers 400, not 500, when the prompt update has no body", async () => {
    const res = await request(app).put("/admin/api/prompts/0").set("x-api-key", KEY);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("prompt is required");
  });

  it("returns the realtime session a webrtc provider creates", async () => {
    const createSession = vi.fn(async () => ({ client_secret: { value: "ephemeral" } }));
    const res = await request(adminApp({ type: "webrtc", async *streamResponse() {}, createSession })).get("/admin/api/session/0").set("x-api-key", KEY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ client_secret: { value: "ephemeral" } });
    expect(createSession).toHaveBeenCalledWith(0, prompts, { 0: "verse", 1: "sage" });
  });

  it("answers 500 without leaking the cause when the provider cannot create a session", async () => {
    const createSession = vi.fn(async () => {
      throw new Error("upstream said: invalid key sk-secret");
    });
    const res = await request(adminApp({ type: "webrtc", async *streamResponse() {}, createSession })).get("/admin/api/session/1").set("x-api-key", KEY);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to create session" });
  });
});

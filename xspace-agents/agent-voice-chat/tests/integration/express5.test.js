// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

// Express 5 behaviour that the codebase relies on: req.body is undefined (not {})
// when a request carries no body, and unmatched routes must answer cleanly.
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import request from "supertest"
import { createTestApp } from "../helpers/create-test-app.js"
import createPersonalityRoutes from "../../src/server/routes/personalities.js"
import createRegistryRoutes from "../../src/server/routes/registry.js"
import { notFound } from "../../src/server/middleware/not-found.js"

const require = createRequire(import.meta.url)

describe("Express 5 compatibility", () => {
  let ctx, app

  beforeEach(() => {
    ctx = createTestApp()
    app = ctx.app
    ctx.registry.defaults = { voice: "alloy" }
    ctx.registry.getLastValidationErrors = () => null
    app.use("/api/personalities", createPersonalityRoutes())
    app.use("/api/agents/registry", createRegistryRoutes({ registry: ctx.registry, ttsProvider: { listVoices: async () => [] } }))
    app.use("/api", notFound)
  })

  afterEach(() => {
    ctx.roomManager.destroy()
  })

  it("is running Express 5", () => {
    const pkg = JSON.parse(readFileSync(require.resolve("express/package.json"), "utf8"))
    expect(Number(pkg.version.split(".")[0])).toBeGreaterThanOrEqual(5)
  })

  describe("requests with no body answer 4xx, never 500", () => {
    it("validated route: POST /api/personalities with no body", async () => {
      const res = await request(app).post("/api/personalities")
      expect(res.status).toBe(400)
      expect(res.body.ok).toBe(false)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("validated route: PUT /api/personalities/:id with no body does not 500", async () => {
      const res = await request(app).put("/api/personalities/missing")
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it("unvalidated route: POST /api/agents/registry/validate with no body", async () => {
      const res = await request(app).post("/api/agents/registry/validate")
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("malformed JSON is a 400 from the body parser, not a 500", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .set("Content-Type", "application/json")
        .send("{not json")
      expect(res.status).toBe(400)
    })
  })

  describe("unmatched routes", () => {
    it("answers the JSON 404 envelope for unknown /api routes", async () => {
      const res = await request(app).get("/api/does/not/exist?x=1")
      expect(res.status).toBe(404)
      expect(res.body.ok).toBe(false)
      expect(res.body.error.code).toBe("NOT_FOUND")
      expect(res.body.error.message).toBe("Route not found: GET /api/does/not/exist")
    })

    it("does not shadow real routes", async () => {
      const res = await request(app).get("/api/personalities")
      expect(res.status).toBe(200)
    })

    it("outside /api falls through to Express's default 404", async () => {
      const res = await request(app).get("/nothing-here")
      expect(res.status).toBe(404)
    })
  })
})

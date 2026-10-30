// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import { z } from "zod"
import { validate } from "../../../src/server/middleware/validate"
import { responseHelpers } from "../../../src/server/middleware/response"

describe("validate middleware", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive()
  })

  // validate() reports failures through res.fail(), which the responseHelpers middleware
  // installs, so wire the real helper onto the mock response.
  function createMocks(body) {
    const req = { body }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    responseHelpers(req, res, () => {})
    return { req, res, next: vi.fn() }
  }

  it("should call next() with valid body", () => {
    const { req, res, next } = createMocks({ name: "Alice", age: 30 })
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.body).toEqual({ name: "Alice", age: 30 })
  })

  it("should return 400 on invalid body", () => {
    const { req, res, next } = createMocks({ name: "", age: -5 })
    validate(schema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: expect.any(Array)
        })
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should return error details for each invalid field", () => {
    const { req, res, next } = createMocks({})
    validate(schema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    const errorBody = res.json.mock.calls[0][0]
    expect(errorBody.error.details.length).toBeGreaterThan(0)
  })

  it("should pass non-Zod errors to next()", () => {
    const badSchema = {
      parse() { throw new Error("unexpected") }
    }
    const { req, res, next } = createMocks({})
    validate(badSchema)(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

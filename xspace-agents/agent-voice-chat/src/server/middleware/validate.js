// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const { ZodError } = require("zod")

function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body ?? {})
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        return res.fail(
          "VALIDATION_ERROR",
          "Request body validation failed",
          400,
          err.issues.map(e => ({ path: e.path.join("."), message: e.message }))
        )
      }
      next(err)
    }
  }
}

module.exports = { validate }

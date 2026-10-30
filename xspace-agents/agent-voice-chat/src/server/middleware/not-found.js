// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const { ERROR_CODES } = require("../errors")

/**
 * Terminal handler for unmatched /api routes. Mount it with `app.use("/api", notFound)`
 * after every API router so clients get the standard JSON error envelope, not an HTML page.
 */
function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl.split("?")[0]}`,
      requestId: req.id
    }
  })
}

module.exports = { notFound }

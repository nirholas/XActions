// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

/**
 * Adds consistent response helpers to res object.
 *
 * res.success(data, statusCode?) -> { ok: true, data }
 * res.fail(code, message, status?, details?) -> { ok: false, error: { code, message, details? } }
 */
function responseHelpers(req, res, next) {
  // A status set earlier in the chain (res.status(201).success(...)) is kept unless
  // an explicit statusCode is passed.
  res.success = (data, statusCode = res.statusCode || 200) => {
    res.status(statusCode).json({ ok: true, data })
  }

  res.fail = (code, message, status = 400, details) => {
    const body = { ok: false, error: { code, message, requestId: req.id } }
    if (details) body.error.details = details
    res.status(status).json(body)
  }

  next()
}

module.exports = { responseHelpers }

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Shared error response helper — use this instead of defining errorResponse
 * locally in every route file.
 *
 * Shape matches the format established in api/routes/ai/actions.js so all
 * routes that migrate to this helper require zero call-site changes.
 */
export function errorResponse(res, statusCode, error, message, extras = {}) {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    retryable: extras.retryable ?? true,
    retryAfterMs: extras.retryAfterMs ?? 5000,
    timestamp: new Date().toISOString(),
    ...extras,
  });
}

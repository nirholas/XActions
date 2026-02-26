# Build 03-09 — API Error Middleware

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-02 (error codes)  
> **Creates:** `api/middleware/error-handler.js`  
> **Modifies:** `api/server.js` (register middleware)

---

## Task

Create Express.js error-handling middleware that converts `XActionsError` instances to consistent JSON API responses with correct HTTP status codes, request ID tracking, and structured error details.

---

## File: `api/middleware/error-handler.js`

### Error Response Format

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limited on /graphql/UserByScreenName. Retry after 45s.",
    "status": 429,
    "retryable": true,
    "retryAfter": 45,
    "requestId": "req_abc123",
    "timestamp": "2026-02-26T12:00:00.000Z"
  }
}
```

### Main Error Handler

```javascript
import { isXActionsError, isRateLimited } from '../../src/client/errors.js';
import { randomUUID } from 'node:crypto';

/**
 * Express error-handling middleware.
 * Must be registered LAST in the middleware chain.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || `req_${randomUUID().slice(0, 12)}`;

  // Log error with context
  console.error(JSON.stringify({
    requestId,
    method: req.method,
    path: req.path,
    error: err.code || 'UNKNOWN',
    message: err.message,
    duration: Date.now() - (req._startTime || Date.now()),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  if (isXActionsError(err)) {
    const response = {
      error: {
        code: err.code,
        message: err.message,
        status: err.statusCode,
        retryable: err.retryable,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    // Add rate limit headers
    if (isRateLimited(err)) {
      const retryAfter = Math.ceil(err.retryAfterMs / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Reset', String(Math.ceil(err.resetAt.getTime() / 1000)));
      response.error.retryAfter = retryAfter;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unknown error — don't leak internals
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      status: 500,
      retryable: false,
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
```

### 404 Handler

```javascript
/**
 * Handle requests to unknown routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      status: 404,
      retryable: false,
      timestamp: new Date().toISOString(),
    },
  });
}
```

### Request Timing Middleware

```javascript
/**
 * Add request start time for duration tracking.
 */
export function requestTimer(req, res, next) {
  req._startTime = Date.now();
  next();
}
```

---

## Integration with `api/server.js`

```javascript
import { errorHandler, notFoundHandler, requestTimer } from './middleware/error-handler.js';

// Early in middleware chain:
app.use(requestTimer);

// After all routes:
app.use(notFoundHandler);
app.use(errorHandler);
```

---

## Acceptance Criteria

- [ ] Express error middleware signature `(err, req, res, next)`
- [ ] JSON error responses with code, message, status, retryable
- [ ] Request ID tracking (from header or generated)
- [ ] Rate limit errors set `Retry-After` header
- [ ] 404 handler for unknown routes
- [ ] Request timing middleware
- [ ] Stack trace only in development
- [ ] Unknown errors return 500 without leaking internals

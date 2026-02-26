# Build 03-05 — HTTP Client Error Handling

> **Modifies:** `src/scrapers/twitter/http.js` (from Track 01)
> **Depends on:** Track 01 Build 03 (HTTP client), Track 03 Build 01 (error classes), Track 03 Build 02 (retry engine)

---

## Task

Integrate the error handling system into the HTTP-based Twitter client built in Track 01. Every HTTP request must be wrapped with proper error detection, retry logic, and rate limit tracking.

---

## Implementation

### 1. Response status → Error class mapping

```javascript
function handleHttpResponse(response, endpoint) {
  const status = response.status;
  const headers = response.headers;

  // Update rate limit tracking
  rateLimitManager.updateFromHeaders(endpoint, {
    limit: headers['x-rate-limit-limit'],
    remaining: headers['x-rate-limit-remaining'],
    reset: headers['x-rate-limit-reset'],
  });

  if (status === 200) return response;
  
  if (status === 401 || status === 403) {
    throw new AuthError(`Authentication failed (${status})`, {
      context: { endpoint, status },
    });
  }
  
  if (status === 404) {
    throw new NotFoundError(`Resource not found: ${endpoint}`, {
      context: { endpoint, status },
    });
  }
  
  if (status === 429) {
    const resetAt = headers['x-rate-limit-reset']
      ? parseInt(headers['x-rate-limit-reset']) * 1000
      : Date.now() + 15 * 60 * 1000;
    throw new RateLimitError(`Rate limited on ${endpoint}`, {
      retryAfterMs: resetAt - Date.now(),
      resetAt: new Date(resetAt),
      context: { endpoint, limit: headers['x-rate-limit-limit'] },
    });
  }

  if (status >= 500) {
    throw new TwitterApiError(`Twitter server error (${status})`, {
      context: { endpoint, status, body: response.data },
    });
  }

  throw new TwitterApiError(`Unexpected status ${status}`, {
    context: { endpoint, status },
  });
}
```

### 2. Wrap every GraphQL request

```javascript
async function graphqlRequest(endpoint, variables, features) {
  await rateLimitManager.throttle(endpoint);
  
  return twitterRetry(async () => {
    const response = await fetch(buildGraphQLUrl(endpoint, variables, features), {
      headers: buildHeaders(),
    });
    return handleHttpResponse(response, endpoint);
  }, {
    maxRetries: 3,
    shouldRetry: (err) => {
      if (err instanceof AuthError) return false;
      if (err instanceof NotFoundError) return false;
      if (err instanceof RateLimitError) return true; // retry after wait
      return true;
    },
    onRetry: (err, attempt) => {
      if (err instanceof RateLimitError) {
        return rateLimitManager.strategy.onRateLimit({
          endpoint,
          resetAt: err.resetAt.getTime(),
          attempt,
        });
      }
    },
  });
}
```

### 3. Network error wrapping

```javascript
async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new NetworkError(`Cannot reach Twitter: ${err.message}`, { cause: err });
    }
    if (err.code === 'ETIMEDOUT' || err.name === 'AbortError') {
      throw new NetworkError(`Request timed out: ${url}`, { cause: err });
    }
    if (err.message?.includes('TLS') || err.message?.includes('SSL')) {
      throw new NetworkError(`TLS/SSL error (may need TLS bypass): ${err.message}`, {
        cause: err,
        context: { url, suggestion: 'Try enabling CycleTLS or tls-client' },
      });
    }
    throw new NetworkError(`Request failed: ${err.message}`, { cause: err, context: { url } });
  }
}
```

### 4. GraphQL error data parsing

```javascript
function parseGraphQLErrors(data, endpoint) {
  if (!data?.errors?.length) return data;

  const errors = data.errors;
  
  for (const error of errors) {
    if (error.code === 34 || error.message?.includes('not found')) {
      throw new NotFoundError(`Resource not found via GraphQL: ${endpoint}`, {
        context: { errors },
      });
    }
    if (error.code === 63) {
      throw new SuspendedError(`Account suspended`, { context: { errors } });
    }
    if (error.code === 88) {
      throw new RateLimitError('Rate limit exceeded via GraphQL', {
        retryAfterMs: 15 * 60 * 1000,
        context: { errors },
      });
    }
  }

  // Non-fatal errors — log and return data
  console.warn(`⚠️ GraphQL warnings on ${endpoint}:`, errors.map(e => e.message));
  return data;
}
```

---

## Tests: `tests/errors/http-error-handling.test.js`

1. Test 401 response → AuthError
2. Test 429 response → RateLimitError with parsed resetAt
3. Test 404 response → NotFoundError
4. Test 500 response → TwitterApiError
5. Test network timeout → NetworkError
6. Test GraphQL error code 34 → NotFoundError
7. Test GraphQL error code 63 → SuspendedError
8. Test rate limit header tracking updates manager
9. Test proactive throttle delays requests when remaining is low

---

## Acceptance Criteria
- [ ] Every HTTP status code maps to correct error class
- [ ] Rate limit headers parsed and tracked in RateLimitManager
- [ ] GraphQL-level errors parsed from response body
- [ ] Network errors wrapped with helpful context
- [ ] Retry integration with rate limit awareness
- [ ] All 9 tests pass

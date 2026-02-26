# Build 03-06 — MCP Server Error Handling

> **Modifies:** `src/mcp/server.js`, `src/mcp/local-tools.js`
> **Depends on:** Track 03 Build 01 (error classes)

---

## Task

Add structured error handling to all 140+ MCP tool handlers in the MCP server. Currently, if any tool handler throws, the error propagates unhandled. Every tool must return structured error responses that AI agents (Claude, GPT) can understand and act upon.

---

## Implementation

### 1. MCP error response format

```javascript
function mcpError(toolName, error) {
  const base = {
    isError: true,
    tool: toolName,
    errorType: error.constructor.name,
    message: error.message,
  };

  if (error instanceof RateLimitError) {
    return {
      ...base,
      retryable: true,
      retryAfterMs: error.retryAfterMs,
      resetAt: error.resetAt?.toISOString(),
      suggestion: `Wait ${Math.ceil((error.retryAfterMs || 900000) / 1000)}s before retrying`,
    };
  }
  if (error instanceof AuthError) {
    return {
      ...base,
      retryable: false,
      suggestion: 'Check your Twitter cookie/credentials and re-authenticate',
    };
  }
  if (error instanceof NotFoundError) {
    return {
      ...base,
      retryable: false,
      suggestion: 'Verify the username, tweet ID, or resource exists',
    };
  }
  if (error instanceof ValidationError) {
    return {
      ...base,
      retryable: false,
      suggestion: `Fix the input: ${error.message}`,
    };
  }
  // Default
  return {
    ...base,
    retryable: error instanceof NetworkError,
    suggestion: 'An unexpected error occurred. Check logs for details.',
  };
}
```

### 2. Tool handler wrapper

```javascript
function withErrorHandling(toolName, handler) {
  return async (params) => {
    try {
      const result = await handler(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorResponse = mcpError(toolName, error);
      console.error(`🔴 MCP tool ${toolName} failed:`, error.message);
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResponse, null, 2) }],
        isError: true,
      };
    }
  };
}
```

### 3. Apply to all tool registrations

Replace every raw handler:

```javascript
// BEFORE
server.setRequestHandler(ListToolsRequestSchema, async () => { ... });

// AFTER — each tool uses the wrapper
const tools = {
  x_scrape_profile: withErrorHandling('x_scrape_profile', async ({ username }) => {
    if (!username) throw new ValidationError('username parameter is required');
    return scrapeProfile(page, username);
  }),
  
  x_scrape_followers: withErrorHandling('x_scrape_followers', async ({ username, count }) => {
    if (!username) throw new ValidationError('username parameter is required');
    return scrapeFollowers(page, username, { count: count ?? 100 });
  }),
  
  // ... all 140+ tools
};
```

### 4. Input validation for every tool

```javascript
function validateToolInput(toolName, params, schema) {
  const errors = [];
  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && (params[key] === undefined || params[key] === null || params[key] === '')) {
      errors.push(`${key} is required`);
    }
    if (rules.type && params[key] !== undefined && typeof params[key] !== rules.type) {
      errors.push(`${key} must be a ${rules.type}, got ${typeof params[key]}`);
    }
    if (rules.min !== undefined && params[key] < rules.min) {
      errors.push(`${key} must be >= ${rules.min}`);
    }
    if (rules.max !== undefined && params[key] > rules.max) {
      errors.push(`${key} must be <= ${rules.max}`);
    }
  }
  if (errors.length) {
    throw new ValidationError(`Invalid input for ${toolName}: ${errors.join(', ')}`);
  }
}
```

### 5. Add health check tool with error reporting

```javascript
const healthTool = withErrorHandling('x_health_check', async () => {
  return {
    status: 'ok',
    version: pkg.version,
    rateLimits: rateLimitManager.getAllStatus(),
    browserConnected: !!browser?.isConnected(),
    lastError: lastErrorLog?.[0] || null,
  };
});
```

---

## Tests: `tests/errors/mcp-error-handling.test.js`

1. Test withErrorHandling returns structured error for AuthError
2. Test withErrorHandling returns structured error for RateLimitError with retryAfterMs
3. Test withErrorHandling returns structured error for ValidationError
4. Test input validation rejects missing required params
5. Test input validation rejects wrong types
6. Test successful tool returns content array
7. Test error response includes `isError: true`

---

## Acceptance Criteria
- [ ] All 140+ MCP tool handlers wrapped with `withErrorHandling`
- [ ] Structured JSON error responses with `errorType`, `retryable`, `suggestion`
- [ ] Input validation for every tool's required parameters
- [ ] Rate limit errors include reset time and retry suggestion
- [ ] Health check tool exposes rate limit status
- [ ] All tests pass

# Build 03-08 — MCP Error Responses

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-02 (error codes)  
> **Creates:** `src/mcp/error-handler.js`  
> **Modifies:** `src/mcp/server.js` (wrap tool handlers)

---

## Task

Create MCP-compliant error responses that AI agents (Claude, GPT) can understand and act on. Convert `XActionsError` instances to MCP SDK error objects with structured retry guidance.

---

## File: `src/mcp/error-handler.js`

### `formatMcpError(error)`

```javascript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { isXActionsError, isRateLimited, isAuthError } from '../client/errors.js';

/**
 * Convert XActionsError to MCP-compliant error response.
 * MCP tools return content arrays — errors become text content items
 * with structured metadata the AI agent can parse.
 *
 * @param {Error} error
 * @returns {{ content: Array, isError: true }}
 */
export function formatMcpError(error) {
  const base = {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: true,
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        retryable: error.retryable || false,
        suggestion: getSuggestion(error),
        ...(isRateLimited(error) && {
          retryAfterMs: error.retryAfterMs,
          resetAt: error.resetAt?.toISOString(),
        }),
      }, null, 2),
    }],
  };
  return base;
}
```

### `getSuggestion(error)`

Return AI-consumable suggestions:
- `AuthError` → "Call x_login tool to refresh authentication"  
- `RateLimitError` → "Wait {retryAfterMs}ms before retrying this operation"
- `NetworkError` → "Retry the request — this is a transient network failure"
- `ValidationError` → "Fix the input: {field} should be {expected}"
- `ScraperError` → "Retry the operation — the scraper encountered a temporary issue"

### `wrapMcpTool(handler, toolName)`

```javascript
/**
 * Wrap an MCP tool handler with error formatting.
 * @param {Function} handler - Tool handler function
 * @param {string} toolName - Tool name for error context
 * @returns {Function} Wrapped handler
 */
export function wrapMcpTool(handler, toolName) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (error) {
      return formatMcpError(error);
    }
  };
}
```

### `toMcpErrorCode(error)`

Map `XActionsError` codes to MCP SDK error codes:
- `ValidationError` → `ErrorCode.InvalidParams`
- `AuthError` → `ErrorCode.InvalidRequest`
- `RateLimitError` → `ErrorCode.InternalError` (with retry metadata)
- All others → `ErrorCode.InternalError`

---

## Integration with `src/mcp/server.js`

The MCP server registers tools with `server.setRequestHandler('tools/call', ...)`. Each tool's handler should be wrapped:

```javascript
// In the tool dispatch switch/if chain:
case 'x_get_profile':
  return await wrapMcpTool(handleGetProfile, 'x_get_profile')(args);
```

Or apply globally in the request handler by wrapping the entire dispatch.

---

## Acceptance Criteria

- [ ] `formatMcpError()` returns valid MCP content array
- [ ] Structured JSON in text content item for AI parsing
- [ ] AI-consumable suggestions for each error type
- [ ] Rate limit errors include `retryAfterMs`
- [ ] `wrapMcpTool()` catches all errors in tool handlers
- [ ] Errors don't crash the MCP server
- [ ] Compatible with `@modelcontextprotocol/sdk` types

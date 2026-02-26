# Build 05-09 — Fix MCP Server Lint Errors

> **Agent Role:** Implementer
> **Depends on:** `05-01` through `05-06` (all lint config)
> **Creates:** modified `src/mcp/server.js`, other files in `src/mcp/`

---

## Task

Fix all ESLint and Prettier violations in `src/mcp/server.js` (3,899 lines — the largest file in the project) and any other files in `src/mcp/`. Add JSDoc to all MCP tool handler functions. **Do NOT change any MCP tool behavior.**

---

## Step 1 — Baseline Count

```bash
# Count current errors in src/mcp/
npx eslint src/mcp/ 2>&1 | tail -5

# Count by rule
npx eslint src/mcp/ -f compact 2>&1 | grep -oP '\(\S+\)' | sort | uniq -c | sort -rn

# List all files in src/mcp/
find src/mcp/ -name '*.js' -exec wc -l {} + | sort -rn
```

---

## Step 2 — Auto-Fix

```bash
# ESLint auto-fix
npx eslint --fix src/mcp/

# Prettier format
npx prettier --write src/mcp/
```

---

## Step 3 — Manual Fixes for `src/mcp/server.js`

This is the largest file (3,899 lines). The MCP server defines many tool handlers. Work through systematically.

### 3a — Understand the Structure

```bash
# Find tool handler definitions
grep -n 'tool\|handler\|function\|export' src/mcp/server.js | head -50

# Find all function definitions
grep -n 'function\|const.*=.*async\|const.*=.*(' src/mcp/server.js | head -50
```

### 3b — Unused Variables

The MCP server likely has unused variables from tool additions/refactoring:

```bash
npx eslint src/mcp/server.js --rule '{"no-unused-vars": "error"}' 2>&1 | head -30
```

Common patterns:
```js
// BEFORE — destructured but unused
const { data, meta, errors } = await fetchResult();
// Only 'data' is used

// AFTER — prefix unused with _
const { data, _meta, _errors } = await fetchResult();
// OR remove entirely if safe
const { data } = await fetchResult();
```

### 3c — `var` → `const`/`let`

Work file section by section:
```js
// BEFORE
var tools = [];
var server;

// AFTER
const tools = [];
let server;  // reassigned later
```

### 3d — Error Handling Patterns

```js
// BEFORE
throw 'Tool not found';
throw { error: 'invalid input' };

// AFTER
throw new Error('Tool not found');
throw new Error('invalid input');
```

### 3e — Equality Checks

```js
// BEFORE — common in switch/case and tool validation
if (toolName == 'x_get_profile') { ... }

// AFTER
if (toolName === 'x_get_profile') { ... }
```

---

## Step 4 — Add JSDoc to Tool Handlers

Each MCP tool handler should have JSDoc:

```js
/**
 * Handles the x_get_profile MCP tool — fetches a Twitter user profile.
 *
 * @param {object} params - Tool input parameters
 * @param {string} params.username - Twitter username to fetch
 * @returns {Promise<object>} MCP tool response with profile data
 */
async function handleGetProfile(params) {
  // ...
}
```

### If handlers are defined inline (common in MCP servers):

```js
server.tool('x_get_profile', 'Fetch a Twitter user profile',
  { username: { type: 'string', description: 'Twitter handle' } },
  /**
   * Fetches a Twitter user profile by username.
   *
   * @param {object} params - Tool parameters
   * @param {string} params.username - Twitter handle without @
   * @returns {Promise<object>} MCP response with profile data
   */
  async (params) => {
    // ...
  },
);
```

### JSDoc Template for MCP Tool Handlers

```js
/**
 * [Brief description matching the tool's MCP description].
 *
 * @param {object} params - MCP tool input parameters
 * @param {string} params.[paramName] - [Description]
 * @returns {Promise<object>} MCP tool response
 */
```

---

## Step 5 — Import Order

Reorder imports at the top of `src/mcp/server.js`:

```js
// 1. Node builtins
import fs from 'node:fs';
import path from 'node:path';

// 2. External packages (MCP SDK, etc.)
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// 3. Internal modules
import { getProfile, getFollowers } from '../scrapers/twitter/index.js';
import { authenticate } from '../auth/index.js';
```

---

## Step 6 — Verify

```bash
# Lint check — should be 0 errors
npx eslint src/mcp/ 2>&1

# Prettier check — should pass
npx prettier --check src/mcp/

# Verify MCP server can still start/parse
node -e "import('./src/mcp/server.js').then(() => console.log('OK')).catch(e => console.error(e))" 2>&1 | head -5

# Run tests
npx vitest run --reporter=verbose 2>&1 | grep -E 'mcp|PASS|FAIL' | head -20

# Final count
npx eslint src/mcp/ 2>&1 | tail -5
```

---

## Safety Checklist

- [ ] All MCP tool names unchanged (e.g., `x_get_profile`, `x_unfollow`, etc.)
- [ ] All MCP tool descriptions unchanged
- [ ] All MCP tool input schemas unchanged
- [ ] All MCP tool response formats unchanged
- [ ] No tool handlers removed or reordered
- [ ] Server initialization code unchanged
- [ ] Transport setup unchanged
- [ ] Error responses maintain same format

---

## Acceptance Criteria

- [ ] `npx eslint src/mcp/` reports 0 errors
- [ ] `npx prettier --check src/mcp/` passes
- [ ] All `var` declarations replaced with `const` or `let`
- [ ] All `==` comparisons replaced with `===`
- [ ] Import order follows standard groups
- [ ] Unused variables removed or prefixed with `_`
- [ ] All MCP tool handlers have JSDoc with `@param` and `@returns`
- [ ] No behavioral changes — all MCP tools work identically
- [ ] All existing tests pass

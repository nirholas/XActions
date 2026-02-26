# Build 05-10 — Fix API Lint Errors

> **Agent Role:** Implementer
> **Depends on:** `05-01` through `05-06` (all lint config)
> **Creates:** modified files in `api/`

---

## Task

Fix all ESLint and Prettier violations across the entire `api/` directory: `api/server.js`, `api/routes/*.js`, `api/middleware/*.js`, `api/services/*.js`, `api/utils/*.js`, and `api/config/*.js`. Pay special attention to Express.js patterns. **Do NOT change any API behavior.**

---

## Step 1 — Baseline Count

```bash
# List all API files
find api/ -name '*.js' -exec wc -l {} + | sort -rn

# Count current errors in api/
npx eslint api/ 2>&1 | tail -5

# Count by rule
npx eslint api/ -f compact 2>&1 | grep -oP '\(\S+\)' | sort | uniq -c | sort -rn
```

---

## Step 2 — Auto-Fix

```bash
# ESLint auto-fix
npx eslint --fix api/

# Prettier format
npx prettier --write api/
```

---

## Step 3 — Express.js-Specific Manual Fixes

### 3a — Error Handler Signature

Express error handlers MUST have exactly 4 parameters — even if some are unused. ESLint's `no-unused-vars` will flag them. Use `_` prefix:

```js
// BEFORE — ESLint warns about unused 'next'
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// AFTER — prefix unused params with _
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});
```

**Critical:** Do NOT remove the 4th parameter from Express error handlers — Express uses the arity (parameter count) to identify error middleware.

### 3b — Unused `next` in Regular Middleware

```js
// BEFORE — next unused in final handler
app.get('/api/status', (req, res, next) => {
  res.json({ status: 'ok' });
});

// AFTER — remove unused next, or prefix
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});
// OR if next is needed for error handling flow:
app.get('/api/status', (req, res, _next) => {
  res.json({ status: 'ok' });
});
```

### 3c — Unused `req` in Response-Only Handlers

```js
// BEFORE
app.get('/health', (req, res) => {
  res.json({ healthy: true });
});

// AFTER — prefix unused req
app.get('/health', (_req, res) => {
  res.json({ healthy: true });
});
```

---

## Step 4 — Fix Route Files

### `api/routes/*.js`

For each route file:

```bash
# List route files
ls api/routes/
```

Each route file should have:
- Proper import order
- JSDoc on each route handler
- No unused variables
- `const` instead of `var`/`let` where possible

### JSDoc Template for Route Handlers

```js
/**
 * GET /api/profile/:username — Fetches a Twitter profile.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 */
router.get('/profile/:username', async (req, res, next) => {
  // ...
});
```

---

## Step 5 — Fix Middleware Files

### `api/middleware/*.js`

```bash
ls api/middleware/
```

Common patterns to fix:
- Auth middleware — ensure proper error propagation
- Rate limiter — fix any `var` usage
- CORS config — ensure consistent style

---

## Step 6 — Fix Service Files

### `api/services/*.js`

```bash
ls api/services/
```

Service files are the business logic layer. Fix:
- Import order
- Unused variables
- JSDoc on exported functions
- `var` → `const`

---

## Step 7 — Fix Utility and Config Files

### `api/utils/*.js` and `api/config/*.js`

```bash
ls api/utils/ api/config/
```

Fix the same standard issues.

---

## Step 8 — Verify

```bash
# Lint check — should be 0 errors
npx eslint api/ 2>&1

# Prettier check — should pass
npx prettier --check api/

# Test API server starts
timeout 5 node api/server.js 2>&1 || true

# Run tests
npx vitest run --reporter=verbose 2>&1 | grep -E 'api|route|middleware|PASS|FAIL' | head -20

# Final count
npx eslint api/ 2>&1 | tail -5
```

---

## Safety Checklist

- [ ] All route paths unchanged (e.g., `/api/profile/:username`)
- [ ] All HTTP methods unchanged (GET/POST/PUT/DELETE)
- [ ] All response status codes unchanged
- [ ] All response body structures unchanged
- [ ] Express error handlers still have 4 parameters
- [ ] Middleware order in `server.js` unchanged
- [ ] CORS configuration unchanged
- [ ] Authentication/authorization logic unchanged
- [ ] Rate limiting logic unchanged

---

## Acceptance Criteria

- [ ] `npx eslint api/` reports 0 errors
- [ ] `npx prettier --check api/` passes
- [ ] All `var` declarations replaced with `const` or `let`
- [ ] Express error handlers use `_` prefix for unused params (4-param signature preserved)
- [ ] Import order follows standard groups in all API files
- [ ] All route handlers have JSDoc with HTTP method, path, and description
- [ ] All exported service functions have JSDoc
- [ ] Unused variables removed or prefixed with `_`
- [ ] No behavioral changes — all API endpoints work identically
- [ ] All existing tests pass

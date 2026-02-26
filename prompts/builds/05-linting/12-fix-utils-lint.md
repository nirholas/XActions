# Build 05-12 — Fix Utils, Auth & Client Lint Errors

> **Agent Role:** Implementer
> **Depends on:** `05-01` through `05-06` (all lint config), `05-07` through `05-11` (prior fix builds)
> **Creates:** modified files in `src/utils/`, `src/auth/`, `src/client/`, remaining `src/` files

---

## Task

Fix all ESLint and Prettier violations in the remaining `src/` directories: `src/utils/`, `src/auth/`, `src/client/`, and any other `src/` files not covered by builds 07–11. Special attention to `src/utils/core.js` which is a browser IIFE requiring a specific lint override. Also ensure all new code from Track 03 (error handling) passes lint. **Do NOT change any behavior.**

---

## Step 1 — Enumerate Remaining Files

```bash
# Files already covered by previous builds:
# src/scrapers/ (build 07), src/cli/ (build 08), src/mcp/ (build 09), src/automation/ (build 11)

# Remaining src/ files
find src/ -name '*.js' \
  -not -path 'src/scrapers/*' \
  -not -path 'src/cli/*' \
  -not -path 'src/mcp/*' \
  -not -path 'src/automation/*' \
  -exec wc -l {} + | sort -rn

# Count errors
npx eslint src/utils/ src/auth/ src/client/ 2>&1 | tail -5
```

---

## Step 2 — Handle `src/utils/core.js` (Browser IIFE)

### 2a — Understand the File

`src/utils/core.js` (675 lines) is a browser IIFE that users paste into DevTools. It is NOT a Node.js module.

```bash
head -20 src/utils/core.js
```

Expected structure:
```js
// XActions Core — by nichxbt
(function() {
  'use strict';
  // ... browser utility functions ...
  // Uses: window, document, sessionStorage, fetch, console
})();
```

### 2b — Verify ESLint Config

The file should be configured with browser globals and `sourceType: 'script'`:

```bash
npx eslint --print-config src/utils/core.js 2>&1 | grep -E 'sourceType|globals' | head -5
```

Expected:
- `sourceType: 'script'`
- `globals` includes `window`, `document`, `sessionStorage`, `fetch`

### 2c — If Additional Override Needed

If `core.js` has unique patterns (e.g., defines globals on `window`), add a file-specific override in `eslint.config.js`:

```js
  // ── src/utils/core.js — browser IIFE with specific overrides ────
  {
    files: ['src/utils/core.js'],
    rules: {
      'no-unused-vars': 'off',     // IIFE may define functions for external use
      'no-inner-declarations': 'off', // functions inside IIFE are fine
    },
  },
```

### 2d — Fix core.js

```bash
npx eslint --fix src/utils/core.js
npx prettier --write src/utils/core.js
```

Then manual fixes for remaining issues. Ensure:
- `var` → `const`/`let` (safe inside IIFE)
- `==` → `===`
- Consistent quotes and semicolons
- No changes to function names/signatures (external scripts call these)

---

## Step 3 — Fix `src/auth/` Files

```bash
find src/auth/ -name '*.js' -exec wc -l {} + | sort -rn
```

Common auth-related lint issues:
- Hardcoded strings that look like credentials (should use env vars)
- `var` declarations in cookie handling
- Unused imports from refactoring

```bash
npx eslint --fix src/auth/
npx prettier --write src/auth/
npx eslint src/auth/ 2>&1
```

Manual fixes for remaining issues. Add JSDoc to exported functions.

---

## Step 4 — Fix `src/client/` Files

```bash
find src/client/ -name '*.js' -exec wc -l {} + | sort -rn
```

```bash
npx eslint --fix src/client/
npx prettier --write src/client/
npx eslint src/client/ 2>&1
```

Manual fixes for remaining issues. Add JSDoc to exported functions.

---

## Step 5 — Fix Remaining `src/` Files

Catch any files not in the above categories:

```bash
# Root-level src/ files
ls src/*.js 2>/dev/null

# Any other subdirectories
find src/ -maxdepth 1 -type d | grep -v -E 'scrapers|cli|mcp|automation|utils|auth|client'
```

Fix each:
```bash
npx eslint --fix src/<file>
npx prettier --write src/<file>
```

---

## Step 6 — Verify Track 03 Code Passes Lint

If Track 03 (error handling) introduced new code (error classes, retry logic, etc.), verify it passes lint:

```bash
# Check for error-related files
find src/ -name '*error*' -o -name '*Error*' | head -10
grep -rl 'class.*Error' src/ --include='*.js' | head -10

# Lint those files
npx eslint $(grep -rl 'class.*Error' src/ --include='*.js') 2>&1
```

---

## Step 7 — Full `src/` Verification

```bash
# Lint ALL of src/ — this covers everything fixed in builds 07-12
npx eslint src/ 2>&1 | tail -10

# Count remaining errors (should be 0)
npx eslint src/ 2>&1 | grep -c 'error' || echo "0 errors"

# Count remaining warnings
npx eslint src/ 2>&1 | grep -c 'warning' || echo "0 warnings"

# Prettier check on ALL of src/
npx prettier --check src/

# Run all tests
npx vitest run --reporter=verbose 2>&1 | tail -20
```

---

## Safety Checklist

- [ ] `src/utils/core.js` remains a valid IIFE pasteable in DevTools
- [ ] No function names/signatures changed in `core.js` (other scripts depend on them)
- [ ] Auth token handling unchanged
- [ ] Cookie handling unchanged
- [ ] Client HTTP request patterns unchanged
- [ ] No behavioral changes in any file
- [ ] All tests pass

---

## Acceptance Criteria

- [ ] `npx eslint src/utils/` reports 0 errors
- [ ] `npx eslint src/auth/` reports 0 errors
- [ ] `npx eslint src/client/` reports 0 errors
- [ ] `npx prettier --check src/utils/ src/auth/ src/client/` passes
- [ ] `src/utils/core.js` has correct browser IIFE override in ESLint config
- [ ] `src/utils/core.js` has no `no-undef` errors for browser globals
- [ ] Track 03 error handling code passes lint
- [ ] All `var` declarations replaced with `const` or `let`
- [ ] Exported functions in `src/auth/` and `src/client/` have JSDoc
- [ ] Full `npx eslint src/` reports 0 errors
- [ ] All existing tests pass

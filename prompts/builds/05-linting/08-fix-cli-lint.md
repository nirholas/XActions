# Build 05-08 — Fix CLI Lint Errors

> **Agent Role:** Implementer
> **Depends on:** `05-01` through `05-06` (all lint config)
> **Creates:** modified `src/cli/index.js`, other files in `src/cli/`

---

## Task

Fix all ESLint and Prettier violations in `src/cli/index.js` (2,983 lines) and any other files in `src/cli/`. Add JSDoc to all exported functions. **Do NOT change any CLI behavior.**

---

## Step 1 — Baseline Count

```bash
# Count current errors in src/cli/
npx eslint src/cli/ 2>&1 | tail -5

# Count by rule
npx eslint src/cli/ -f compact 2>&1 | grep -oP '\(\S+\)' | sort | uniq -c | sort -rn

# List all files in src/cli/
find src/cli/ -name '*.js' -exec wc -l {} + | sort -rn
```

---

## Step 2 — Auto-Fix

```bash
# ESLint auto-fix
npx eslint --fix src/cli/

# Prettier format
npx prettier --write src/cli/
```

---

## Step 3 — Manual Fixes for `src/cli/index.js`

This is a 2,983-line file. Work through it systematically in sections:

### 3a — Unused Variables

The CLI file likely has accumulated unused variables from feature additions. Common patterns:

```js
// BEFORE — unused import
import { unusedHelper } from '../utils/helpers.js';

// FIX — remove the import entirely (if truly unused)
// OR prefix with _ if it's intentionally available
```

**How to find them:**
```bash
npx eslint src/cli/index.js --rule '{"no-unused-vars": "error"}' 2>&1 | head -30
```

### 3b — `var` → `const`/`let`

```js
// BEFORE
var commander = await import('commander');
var result = await fetchData();

// AFTER
const commander = await import('commander');
const result = await fetchData();
```

Determine if the variable is ever reassigned:
- Reassigned → `let`
- Never reassigned → `const`

### 3c — String Quote Consistency

Prettier will handle this, but verify any template literals are appropriate:

```js
// Don't convert template literals that use interpolation
const msg = `Hello ${name}`;  // keep as template literal

// Do convert unnecessary template literals
const msg = `Hello world`;    // → const msg = 'Hello world';
```

### 3d — Import Order

The CLI file likely imports from many sources. Reorder:

```js
// 1. Node builtins
import fs from 'node:fs';
import path from 'node:path';

// 2. External packages
import chalk from 'chalk';
import { Command } from 'commander';

// 3. Internal modules
import { getProfile } from '../scrapers/twitter/index.js';
import { authenticate } from '../auth/index.js';
```

---

## Step 4 — Add JSDoc to Exported Functions

Identify all exported functions and add JSDoc:

```bash
# Find all exports
grep -n 'export ' src/cli/index.js | head -30
```

For each exported function, add JSDoc:

```js
/**
 * Runs the unfollow command for users who don't follow back.
 *
 * @param {object} options - CLI options
 * @param {string} options.username - Target Twitter username
 * @param {boolean} [options.dryRun] - If true, only preview without unfollowing
 * @param {number} [options.limit] - Maximum number of users to unfollow
 * @returns {Promise<void>}
 */
export async function unfollowNonFollowers(options) {
  // ...
}
```

### JSDoc Template for CLI Commands

```js
/**
 * [Brief description of what the command does].
 *
 * @param {object} options - Command-line options parsed by commander
 * @param {string} [options.paramName] - Description
 * @returns {Promise<void>}
 */
```

---

## Step 5 — Verify

```bash
# Lint check — should be 0 errors
npx eslint src/cli/ 2>&1

# Prettier check — should pass
npx prettier --check src/cli/

# Run CLI help to verify no break
node src/cli/index.js --help 2>&1 | head -10

# Run tests
npx vitest run --reporter=verbose 2>&1 | grep -E 'cli|PASS|FAIL' | head -20

# Final count comparison
npx eslint src/cli/ 2>&1 | tail -5
```

---

## Safety Checklist

- [ ] CLI `--help` output unchanged
- [ ] All CLI commands execute without errors (test at least 2-3 commands with `--dry-run` if available)
- [ ] No command names or aliases changed
- [ ] No option flags changed
- [ ] No exit codes changed
- [ ] Process.exit() calls preserved
- [ ] All error messages preserved

---

## Acceptance Criteria

- [ ] `npx eslint src/cli/` reports 0 errors
- [ ] `npx prettier --check src/cli/` passes
- [ ] All `var` declarations replaced with `const` or `let`
- [ ] All `==` comparisons replaced with `===`
- [ ] Import order follows standard groups
- [ ] Unused variables removed or prefixed with `_`
- [ ] All exported functions have JSDoc with `@param` and `@returns`
- [ ] No behavioral changes — CLI commands work identically
- [ ] All existing tests pass

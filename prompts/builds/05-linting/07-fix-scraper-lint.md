# Build 05-07 — Fix Scraper Lint Errors

> **Agent Role:** Implementer
> **Depends on:** `05-01` through `05-06` (all lint config)
> **Creates:** modified files in `src/scrapers/`

---

## Task

Fix all ESLint and Prettier violations in the `src/scrapers/` directory. Start with auto-fix, then manually resolve anything remaining. **Do NOT change any runtime behavior** — only code style.

---

## Step 1 — Baseline Count

```bash
# Count current errors in src/scrapers/
npx eslint src/scrapers/ 2>&1 | tail -5

# Count by rule
npx eslint src/scrapers/ -f compact 2>&1 | grep -oP '\(\S+\)' | sort | uniq -c | sort -rn
```

Record the baseline count.

---

## Step 2 — Auto-Fix with ESLint

```bash
npx eslint --fix src/scrapers/
```

This will automatically fix:
- `var` → `const`/`let` (via `no-var`)
- `==` → `===` (via `eqeqeq`)
- Unnecessary `else` after `return` (via `no-else-return`)
- `prefer-const` where `let` is never reassigned
- `prefer-template` for string concatenation
- `object-shorthand` for method definitions
- `no-useless-return` for empty returns
- Import order and newlines (via `import-x/order`)

---

## Step 3 — Auto-Format with Prettier

```bash
npx prettier --write src/scrapers/
```

This will fix:
- Quote style → single quotes
- Semicolons → added where missing
- Indentation → 2 spaces
- Trailing commas → added
- Line width → wrapped at 100 characters

---

## Step 4 — Manual Fixes

After auto-fix, run lint again and manually fix remaining issues:

```bash
npx eslint src/scrapers/ 2>&1 | head -50
```

### Common Manual Fixes Needed

#### 4a — Unused Variables

```js
// BEFORE — unused import
import { someHelper } from './helpers.js';

// FIX — remove unused import or prefix with _
import { _someHelper } from './helpers.js';  // if intentionally kept
// OR simply remove the line
```

#### 4b — `no-throw-literal`

```js
// BEFORE
throw 'Something went wrong';
throw { message: 'error' };

// AFTER
throw new Error('Something went wrong');
throw new Error('error');
```

#### 4c — Unused Function Parameters

```js
// BEFORE — unused parameter
function handleResponse(data, index) {
  return data.name;
}

// AFTER — prefix with underscore
function handleResponse(data, _index) {
  return data.name;
}
```

#### 4d — Import Order

If `eslint --fix` didn't fully fix import order (some cases require manual intervention):

```js
// BEFORE — wrong order
import { parseProfile } from './parsers.js';
import fs from 'node:fs';
import chalk from 'chalk';

// AFTER — correct order
import fs from 'node:fs';

import chalk from 'chalk';

import { parseProfile } from './parsers.js';
```

---

## Step 5 — Key Files to Focus On

### `src/scrapers/twitter/index.js` (952 lines)

This is the largest scraper file. Expected issues:
- Multiple `var` declarations → convert to `const`/`let`
- Inconsistent quote style → single quotes
- Missing semicolons in some places
- Unused variables from refactoring
- `==` comparisons → `===`
- Import order out of sequence

**Read the file carefully** before applying fixes. Ensure:
- All HTTP request URLs remain unchanged
- All GraphQL query IDs remain unchanged
- All cookie/header handling remains unchanged
- All return values remain unchanged

### `src/scrapers/index.js`

- Fix import order
- Fix any unused imports
- Ensure re-exports are clean

### `src/scrapers/twitter/http/*.js` (if exists)

- Fix all files in the HTTP scraper subdirectory
- Same rules as above — no behavior changes

---

## Step 6 — Verify

```bash
# Run lint — should be 0 errors (warnings are OK for now)
npx eslint src/scrapers/ 2>&1

# Run Prettier check — should pass
npx prettier --check src/scrapers/

# Run tests to ensure no behavior change
npx vitest run --reporter=verbose 2>&1 | grep -E 'scraper|PASS|FAIL' | head -20

# Final count
npx eslint src/scrapers/ 2>&1 | tail -5
```

---

## Safety Checklist

Before committing, verify:

- [ ] `npx vitest run` — all scraper tests pass
- [ ] No `require()` changed to `import` or vice versa
- [ ] No URL strings modified
- [ ] No GraphQL query IDs modified
- [ ] No header/cookie handling modified
- [ ] No return types changed
- [ ] No function signatures changed (beyond `_` prefix on unused params)

---

## Acceptance Criteria

- [ ] `npx eslint src/scrapers/` reports 0 errors
- [ ] `npx prettier --check src/scrapers/` passes
- [ ] All `var` declarations replaced with `const` or `let`
- [ ] All `==` comparisons replaced with `===`
- [ ] Consistent single quotes throughout
- [ ] Import order follows: builtins → external → parent → sibling
- [ ] Unused variables removed or prefixed with `_`
- [ ] No behavioral changes — all existing tests pass
- [ ] Warnings (JSDoc, minor style) are acceptable and tracked for future builds

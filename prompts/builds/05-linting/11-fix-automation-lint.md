# Build 05-11 — Fix Automation Script Lint Errors

> **Agent Role:** Implementer
> **Depends on:** `05-01` through `05-06` (all lint config)
> **Creates:** modified files in `src/automation/`

---

## Task

Fix all ESLint and Prettier violations in `src/automation/` (20 browser script files). These are **browser scripts** designed to be pasted into DevTools console on x.com — they use `window`, `document`, `sessionStorage`, and DOM APIs. Ensure the ESLint browser globals config is correct so these do not trigger `no-undef` errors. **Do NOT change any automation behavior.**

---

## Step 1 — Enumerate and Baseline

```bash
# List all automation files
find src/automation/ -name '*.js' -exec wc -l {} + | sort -rn

# Count current errors
npx eslint src/automation/ 2>&1 | tail -5

# Count by rule
npx eslint src/automation/ -f compact 2>&1 | grep -oP '\(\S+\)' | sort | uniq -c | sort -rn

# Check for no-undef errors (browser globals)
npx eslint src/automation/ 2>&1 | grep 'no-undef' | head -10
```

---

## Step 2 — Verify Browser Globals Config

Before fixing files, verify that the ESLint config correctly recognizes browser globals:

```bash
# Check that browser globals are configured
npx eslint --print-config src/automation/algorithmBuilder.js 2>&1 | grep -A5 'globals'
```

The config should include `window`, `document`, `sessionStorage`, `localStorage`, `fetch`, `console`, `alert`, `setTimeout`, `setInterval`, `MutationObserver`, `HTMLElement`, etc.

### If `no-undef` errors persist for browser globals

Check that the `eslint.config.js` entry for browser scripts uses `globals.browser`:

```js
{
  files: ['src/automation/**/*.js'],
  languageOptions: {
    sourceType: 'script',  // These are NOT ESM modules
    globals: {
      ...globals.browser,
      ...globals.es2021,
    },
  },
}
```

### Additional Browser Globals

Some automation scripts may use X/Twitter-specific globals or DOM APIs not in the standard browser set. If specific `no-undef` errors remain, add them manually:

```js
{
  files: ['src/automation/**/*.js'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2021,
      // X/Twitter page globals that scripts may reference
      XActions: 'readonly',
    },
  },
}
```

---

## Step 3 — Auto-Fix

```bash
# ESLint auto-fix
npx eslint --fix src/automation/

# Prettier format
npx prettier --write src/automation/
```

---

## Step 4 — Manual Fixes

### 4a — `var` → `const`/`let`

Browser console scripts historically use `var` by convention. Convert them:

```js
// BEFORE — old browser script style
var followers = [];
var scrollCount = 0;

// AFTER
const followers = [];
let scrollCount = 0;  // modified in loop
```

**Important:** If the script is designed to be re-pasted into the console (re-runnable), `var` allows redeclaration. With `const`/`let`, re-pasting would throw `SyntaxError: Identifier already declared`. 

**Solution:** If scripts are IIFEs or wrapped in blocks, `const`/`let` is safe:

```js
// Safe — wrapped in IIFE
(async () => {
  const followers = [];
  let scrollCount = 0;
  // ...
})();
```

If a script is NOT wrapped, consider wrapping it in an IIFE to allow `const`/`let`:

```js
// BEFORE — top-level var (re-pasteable)
var results = [];
// ... script body ...

// AFTER — wrapped in IIFE (still re-pasteable)
(async () => {
  const results = [];
  // ... script body ...
})();
```

### 4b — Semicolons and Quotes

Prettier will handle this. Just verify after formatting.

### 4c — `==` → `===`

```js
// BEFORE
if (element.textContent == 'Follow') { ... }

// AFTER
if (element.textContent === 'Follow') { ... }
```

### 4d — Unused Variables

```js
// BEFORE
const header = document.querySelector('[data-testid="primaryColumn"]');
// header never used

// AFTER — remove or use
// (remove the line if truly unused)
```

---

## Step 5 — File-by-File Review

Process each file in `src/automation/`:

```bash
ls src/automation/
```

Expected files include:
- `core.js` — shared utilities
- `algorithmBuilder.js` — algorithm training
- `autoLike.js` — auto-like
- `autoFollow.js` — auto-follow
- `autoRepost.js` — auto-repost
- `autoComment.js` — auto-comment
- `keywordFollow.js` — keyword-based follow
- `engagerFollow.js` — follow engagers
- And others...

For each file:
1. Run `npx eslint src/automation/<file>` to see remaining issues
2. Fix manually
3. Verify with `npx eslint src/automation/<file>` again

---

## Step 6 — Verify `src/automation/core.js`

This file is imported by other automation scripts. Ensure:
- It does not use `import`/`export` (browser `sourceType: 'script'`)
- All functions it defines are available globally (via `window.` or just function declarations)
- No `no-undef` errors for browser APIs

---

## Step 7 — Final Verify

```bash
# Lint check — should be 0 errors
npx eslint src/automation/ 2>&1

# Prettier check — should pass
npx prettier --check src/automation/

# Verify no no-undef errors
npx eslint src/automation/ 2>&1 | grep 'no-undef' | wc -l

# Final count
npx eslint src/automation/ 2>&1 | tail -5
```

---

## Safety Checklist

- [ ] All DOM selector strings unchanged (`data-testid` values)
- [ ] All `sessionStorage` keys unchanged
- [ ] All timing delays unchanged (1-3s between actions)
- [ ] All console.log messages unchanged (users may rely on these)
- [ ] Scripts remain pasteable into DevTools console
- [ ] IIFE wrapping (if added) does not change script behavior
- [ ] No `import`/`export` statements added (these are browser scripts)

---

## Acceptance Criteria

- [ ] `npx eslint src/automation/` reports 0 errors
- [ ] `npx prettier --check src/automation/` passes
- [ ] No `no-undef` errors for browser globals (`window`, `document`, `sessionStorage`, `fetch`, etc.)
- [ ] All `var` declarations replaced with `const` or `let` (with IIFE wrapping if needed for re-pasteability)
- [ ] All `==` comparisons replaced with `===`
- [ ] Consistent single quotes and semicolons
- [ ] `sourceType: 'script'` confirmed in ESLint config for these files
- [ ] No behavioral changes — scripts work identically when pasted into DevTools

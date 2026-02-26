# Build 05-06 — Security Lint Rules

> **Agent Role:** Implementer
> **Depends on:** `05-01` (ESLint config)
> **Creates:** updates `eslint.config.js`, updates `package.json`

---

## Task

Add `eslint-plugin-security` to detect common security anti-patterns: `eval()`, `new Function()`, regex denial-of-service, prototype pollution, hardcoded credentials, and unsafe `child_process` usage. Configure test-file overrides to reduce false positives.

---

## Step 1 — Install Dependencies

```bash
npm install -D eslint-plugin-security
```

---

## Step 2 — Update ESLint Config

### File: `eslint.config.js`

Add the import at the top:

```js
import securityPlugin from 'eslint-plugin-security';
```

Add a new config block for security rules. Place it after the JSDoc block:

```js
  // ── Security rules (all source files) ───────────────────────────
  {
    files: [
      'src/**/*.js',
      'api/**/*.js',
      'scripts/**/*.js',
      'dashboard-server.js',
    ],
    plugins: {
      security: securityPlugin,
    },
    rules: {
      // ── Critical: eval and dynamic code execution ────────────────
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-require': 'warn',

      // ── High: child_process safety ───────────────────────────────
      'security/detect-child-process': 'warn',

      // ── Medium: injection patterns ───────────────────────────────
      'security/detect-non-literal-fs-filename': 'off',  // too noisy for this project
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-object-injection': 'off',  // too many false positives with dynamic keys

      // ── Medium: regex DoS ────────────────────────────────────────
      'security/detect-unsafe-regex': 'warn',

      // ── Low: informational ───────────────────────────────────────
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
    },
  },

  // ── Relax security rules for test files ─────────────────────────
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    plugins: {
      security: securityPlugin,
    },
    rules: {
      'security/detect-non-literal-regexp': 'off',
      'security/detect-child-process': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-non-literal-require': 'off',
      'security/detect-eval-with-expression': 'warn',  // still warn in tests
    },
  },
```

---

## Step 3 — Custom No-Hardcoded-Credentials Rule

ESLint `eslint-plugin-security` does not detect hardcoded credentials. Add a custom rule using ESLint's built-in `no-restricted-syntax`:

Add these rules to the main Node.js files config block (the one with `src/scrapers/**/*.js`, etc.):

```js
      // ── Custom: detect hardcoded credential patterns ─────────────
      'no-restricted-syntax': ['warn',
        {
          selector: 'VariableDeclarator[init.type="Literal"] > Identifier[name=/(?:password|secret|token|apiKey|api_key|auth_token|access_token|private_key)/i]',
          message: 'Possible hardcoded credential. Use environment variables instead.',
        },
        {
          selector: 'Property[key.name=/(?:password|secret|token|apiKey|api_key|auth_token|private_key)/i][value.type="Literal"]',
          message: 'Possible hardcoded credential in object. Use environment variables instead.',
        },
      ],
```

---

## Step 4 — Document Known Security Findings

After running the security lint, document any findings that are intentional (not actual vulnerabilities):

### Expected False Positives

| File | Rule | Reason |
|------|------|--------|
| `src/utils/core.js` | `detect-eval-with-expression` | Browser IIFE — not applicable |
| `api/server.js` | `detect-child-process` | May use child_process for background tasks — review manually |
| `scripts/*.js` | `detect-child-process` | Utility scripts legitimately use child_process |
| `tests/**` | various | Test helpers may trigger security rules — relaxed in config |

---

## Step 5 — Verify

```bash
# Verify plugin loads
npx eslint --print-config src/scrapers/twitter/index.js 2>&1 | grep 'security'

# Count security violations
npx eslint . 2>&1 | grep 'security/' | wc -l

# Show specific findings
npx eslint . 2>&1 | grep 'security/detect-eval' | head -5
npx eslint . 2>&1 | grep 'security/detect-child-process' | head -5
npx eslint . 2>&1 | grep 'security/detect-unsafe-regex' | head -5

# Verify test relaxation
npx eslint --print-config tests/http-scraper/profile.test.js 2>&1 | grep 'security/detect-child-process'
```

---

## Acceptance Criteria

- [ ] `eslint-plugin-security` installed as devDependency
- [ ] Security rules added to ESLint config for all source files
- [ ] `detect-eval-with-expression` set to `error`
- [ ] `detect-new-buffer` set to `error`
- [ ] `detect-child-process` set to `warn`
- [ ] `detect-unsafe-regex` set to `warn`
- [ ] `detect-object-injection` set to `off` (too many false positives)
- [ ] `detect-non-literal-fs-filename` set to `off` (too noisy)
- [ ] Test files have relaxed security rules
- [ ] Custom hardcoded-credentials pattern detection added via `no-restricted-syntax`
- [ ] ESLint runs without config errors
- [ ] Security findings documented with known false positives noted

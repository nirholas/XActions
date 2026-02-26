# Build 05-02 — Prettier Configuration

> **Agent Role:** Implementer
> **Depends on:** `05-01` (ESLint config)
> **Creates:** `.prettierrc.json`, `.prettierignore`, updates `eslint.config.js`, updates `package.json`

---

## Task

Set up Prettier as the code formatter for the XActions project, integrate it with ESLint so rule conflicts are eliminated, and add npm scripts for formatting.

---

## Step 1 — Install Dependencies

```bash
npm install -D prettier eslint-config-prettier
```

---

## Step 2 — Create Prettier Config

### File: `.prettierrc.json`

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "quoteProps": "as-needed",
  "proseWrap": "preserve"
}
```

### Rationale

| Option | Value | Why |
|--------|-------|-----|
| `singleQuote` | `true` | Most prevalent in codebase; standard Node.js convention |
| `trailingComma` | `"all"` | Cleaner git diffs, modern ES support |
| `printWidth` | `100` | Balances readability and line density for a CLI-heavy project |
| `tabWidth` | `2` | Already dominant indentation style in the codebase |
| `semi` | `true` | Prevents ASI pitfalls in script-mode browser files |
| `arrowParens` | `"always"` | Consistent, easier to add params later |
| `endOfLine` | `"lf"` | Unix line endings for the Linux dev container |

---

## Step 3 — Create Prettier Ignore File

### File: `.prettierignore`

```
node_modules/
archive/
dist/
coverage/
*.min.js
*.min.css
dashboard/css/
prisma/migrations/
public/
package-lock.json
pnpm-lock.yaml
.husky/
```

---

## Step 4 — Integrate Prettier with ESLint

Update `eslint.config.js` to add `eslint-config-prettier` as the **last** config entry. This disables all ESLint rules that conflict with Prettier.

Add this import at the top of `eslint.config.js`:

```js
import prettierConfig from 'eslint-config-prettier';
```

Add this as the **last element** of the exported config array:

```js
  // ── Prettier — disable conflicting ESLint rules (must be last) ──
  prettierConfig,
];
```

The full tail of the config array should look like:

```js
  // ── CLI entry point (bin/unfollowx — no .js extension) ──────────
  {
    files: ['bin/unfollowx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // ── Prettier — disable conflicting ESLint rules (must be last) ──
  prettierConfig,
];
```

---

## Step 5 — Add Scripts to `package.json`

Add these scripts (do not remove existing ones):

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

## Step 6 — Verify

```bash
# Verify Prettier config loads
npx prettier --find-config-path src/scrapers/twitter/index.js

# Check formatting status (will show unformatted files — that's expected)
npx prettier --check . 2>&1 | tail -10

# Verify ESLint still works with Prettier integration
npx eslint . 2>&1 | tail -5

# Test format on a single file (dry run)
npx prettier --check src/scrapers/twitter/index.js
```

Do **NOT** run `prettier --write .` in this build — formatting will happen in builds 07–12 alongside ESLint fixes, file by file.

---

## Acceptance Criteria

- [ ] `prettier` and `eslint-config-prettier` installed as devDependencies
- [ ] `.prettierrc.json` exists with: `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, `semi: true`, `arrowParens: "always"`
- [ ] `.prettierignore` exists and excludes `node_modules/`, `archive/`, `dist/`, `*.min.js`, `dashboard/css/`
- [ ] `eslint.config.js` imports `eslint-config-prettier` and includes it as the **last** config entry
- [ ] `npm run format` runs `prettier --write .`
- [ ] `npm run format:check` runs `prettier --check .`
- [ ] ESLint still runs without config errors after Prettier integration
- [ ] No formatting changes applied yet (deferred to builds 07–12)

# Build 05-04 — Import Order Rules

> **Agent Role:** Implementer
> **Depends on:** `05-01` (ESLint config)
> **Creates:** updates `eslint.config.js`, updates `package.json`

---

## Task

Add import ordering and grouping enforcement using `eslint-plugin-import-x` (the maintained ESM-compatible fork of `eslint-plugin-import`). This ensures all imports follow a consistent order across the entire codebase.

---

## Step 1 — Install Dependencies

```bash
npm install -D eslint-plugin-import-x
```

> **Why `eslint-plugin-import-x`?** The original `eslint-plugin-import` has incomplete ESM support and does not work with ESLint flat config. `eslint-plugin-import-x` is the community fork that supports both.

---

## Step 2 — Update ESLint Config

### File: `eslint.config.js`

Add the import at the top of the file:

```js
import importPlugin from 'eslint-plugin-import-x';
```

Add a new config block **after** the `js.configs.recommended` entry and **before** the environment-specific blocks:

```js
  // ── Import ordering (all JS files) ──────────────────────────────
  {
    files: ['**/*.js'],
    ignores: [
      'src/utils/core.js',
      'src/automation/**/*.js',
      'dashboard/js/**/*.js',
      'archive/**',
    ],
    plugins: {
      'import-x': importPlugin,
    },
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.mjs', '.json'],
        },
      },
    },
    rules: {
      // ── Import ordering ──────────────────────────────────────────
      'import-x/order': ['warn', {
        'groups': [
          'builtin',        // node:fs, node:path, etc.
          'external',       // npm packages
          'internal',       // project aliases (if any)
          'parent',         // ../foo
          'sibling',        // ./foo
          'index',          // ./
          'type',           // type imports (TS, but future-proof)
        ],
        'newlines-between': 'always',
        'alphabetize': {
          order: 'asc',
          caseInsensitive: true,
        },
        'pathGroups': [
          {
            pattern: 'node:*',
            group: 'builtin',
            position: 'before',
          },
        ],
        'pathGroupsExcludedImportTypes': ['builtin'],
      }],

      // ── Import hygiene ───────────────────────────────────────────
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'warn',
      'import-x/first': 'error',
      'import-x/newline-after-import': ['warn', { count: 1 }],
      'import-x/no-mutable-exports': 'error',
    },
  },
```

### Why Exclude Browser Scripts?

Browser scripts (`src/utils/core.js`, `src/automation/*.js`, `dashboard/js/*.js`) do not use `import` statements — they are either IIFEs or plain scripts pasted into DevTools. The import plugin would produce false positives for them.

---

## Step 3 — Expected Import Order

After this rule is enforced, imports in every Node.js file should follow this pattern:

```js
// 1. Node.js builtins
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 2. External packages (npm)
import chalk from 'chalk';
import express from 'express';

// 3. Internal / project modules (absolute paths if aliases exist)

// 4. Parent imports
import { config } from '../config/index.js';

// 5. Sibling imports
import { parseProfile } from './parsers.js';
import { validateSession } from './validators.js';

// 6. Index imports
import { helpers } from './';
```

Each group is separated by a blank line. Imports within each group are alphabetized (case-insensitive).

---

## Step 4 — Verify

```bash
# Verify the plugin loads
npx eslint --print-config src/scrapers/twitter/index.js 2>&1 | grep 'import-x'

# Run lint and check for import-order warnings
npx eslint . 2>&1 | grep 'import-x' | head -20

# Count import-order violations
npx eslint . 2>&1 | grep 'import-x/order' | wc -l

# Verify browser scripts are NOT checked for imports
npx eslint --print-config src/automation/algorithmBuilder.js 2>&1 | grep 'import-x' || echo "No import-x rules for browser scripts — correct"
```

Do **NOT** auto-fix import order in this build — that happens in builds 07–12.

---

## Acceptance Criteria

- [ ] `eslint-plugin-import-x` installed as devDependency
- [ ] `eslint.config.js` includes import ordering rules for all non-browser JS files
- [ ] Import groups: builtin → external → internal → parent → sibling → index
- [ ] Alphabetization enabled within each group (case-insensitive, ascending)
- [ ] Newline required between groups (`newlines-between: 'always'`)
- [ ] `import-x/no-duplicates`, `import-x/no-self-import`, `import-x/first` enabled
- [ ] Browser scripts (`src/automation/`, `src/utils/core.js`, `dashboard/js/`) excluded from import rules
- [ ] ESLint runs without config errors
- [ ] Import order violations detected (not yet fixed — deferred to builds 07–12)

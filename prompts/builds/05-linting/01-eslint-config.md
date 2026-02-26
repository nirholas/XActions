# Build 05-01 — ESLint Flat Config

> **Agent Role:** Implementer
> **Depends on:** `05-00` (research & baseline)
> **Creates:** `eslint.config.js`, updates `package.json`

---

## Task

Create an ESLint v9+ flat config file with environment-aware settings for the XActions codebase. Node.js files get Node globals; browser scripts get browser globals. Install all required packages.

---

## Step 1 — Install Dependencies

```bash
npm install -D eslint @eslint/js globals
```

Verify the installed versions:
```bash
npx eslint --version  # Should be 9.x+
```

---

## Step 2 — Create ESLint Config

### File: `eslint.config.js`

```js
// eslint.config.js — XActions ESLint flat config
// by nichxbt
import js from '@eslint/js';
import globals from 'globals';

export default [
  // ── Global ignores ────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      'archive/**',
      'dist/**',
      'dashboard/css/**',
      'coverage/**',
      '.husky/**',
      '*.min.js',
      'prisma/**',
      'public/**',
    ],
  },

  // ── Base: ESLint recommended for all JS ───────────────────────────
  js.configs.recommended,

  // ── Node.js files (ESM) ──────────────────────────────────────────
  {
    files: [
      'src/scrapers/**/*.js',
      'src/mcp/**/*.js',
      'src/cli/**/*.js',
      'src/client/**/*.js',
      'src/auth/**/*.js',
      'api/**/*.js',
      'scripts/**/*.js',
      'dashboard-server.js',
      'vitest.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'error',
      'curly': ['error', 'multi-line'],
      'default-case-last': 'error',
      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'no-useless-return': 'warn',
      'prefer-template': 'warn',
      'object-shorthand': ['warn', 'always'],
      'no-useless-rename': 'error',
      'no-useless-concat': 'warn',
      'prefer-arrow-callback': 'warn',
      'symbol-description': 'warn',
      'yoda': 'error',
    },
  },

  // ── Browser scripts (DevTools console scripts) ───────────────────
  {
    files: [
      'src/utils/core.js',
      'src/automation/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
      'no-alert': 'off',       // browser scripts may use alert()
      'no-restricted-globals': 'off',
    },
  },

  // ── Dashboard frontend JS ────────────────────────────────────────
  {
    files: ['dashboard/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
    },
  },

  // ── Test files ───────────────────────────────────────────────────
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'no-throw-literal': 'off',   // tests may throw strings to test error handling
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },

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
];
```

---

## Step 3 — Add `lint` Script to `package.json`

Add the following to the `"scripts"` section of `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint --fix ."
  }
}
```

Do **not** remove any existing scripts — only add these two.

---

## Step 4 — Verify

```bash
# Run lint and capture output
npx eslint . 2>&1 | tail -20

# Count total errors and warnings
npx eslint . 2>&1 | grep -c 'error\|warning' || true

# Verify config loads without errors
npx eslint --print-config src/scrapers/twitter/index.js | head -10
npx eslint --print-config src/automation/algorithmBuilder.js | head -10
npx eslint --print-config dashboard/js/main.js 2>/dev/null | head -10
npx eslint --print-config tests/ 2>/dev/null | head -10
```

ESLint should load without config errors. There **will** be many lint violations at this point — that is expected and will be fixed in builds 07–12.

---

## Acceptance Criteria

- [ ] `eslint` (v9+), `@eslint/js`, and `globals` installed as devDependencies
- [ ] `eslint.config.js` exists with flat config format
- [ ] Node.js files configured with `globals.node` and `sourceType: 'module'`
- [ ] Browser scripts (`src/automation/`, `src/utils/core.js`) configured with `globals.browser` and `sourceType: 'script'`
- [ ] Dashboard JS configured with `globals.browser`
- [ ] Test files configured with `globals.node`
- [ ] `archive/`, `node_modules/`, `dist/`, `dashboard/css/` in global ignores
- [ ] Rules enabled: `no-unused-vars` (warn), `no-console` (off), `prefer-const`, `no-var`, `eqeqeq`, `no-throw-literal`
- [ ] `npm run lint` runs without config errors
- [ ] `npm run lint:fix` runs without config errors
- [ ] No existing scripts removed from `package.json`

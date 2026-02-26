# Build 05-05 — JSDoc Lint Rules

> **Agent Role:** Implementer
> **Depends on:** `05-01` (ESLint config)
> **Creates:** updates `eslint.config.js`, updates `package.json`

---

## Task

Add `eslint-plugin-jsdoc` to enforce documentation standards on all exported functions. Start in warning mode so the codebase can be incrementally documented without blocking development.

---

## Step 1 — Install Dependencies

```bash
npm install -D eslint-plugin-jsdoc
```

---

## Step 2 — Update ESLint Config

### File: `eslint.config.js`

Add the import at the top:

```js
import jsdocPlugin from 'eslint-plugin-jsdoc';
```

Add a new config block for JSDoc rules. Place it after the import-order block and before environment-specific blocks:

```js
  // ── JSDoc rules (Node.js source files only) ─────────────────────
  {
    files: [
      'src/scrapers/**/*.js',
      'src/mcp/**/*.js',
      'src/cli/**/*.js',
      'src/client/**/*.js',
      'src/auth/**/*.js',
      'api/**/*.js',
    ],
    plugins: {
      jsdoc: jsdocPlugin,
    },
    settings: {
      jsdoc: {
        mode: 'permissive',
        tagNamePreference: {
          returns: 'returns',
          augments: 'extends',
        },
      },
    },
    rules: {
      // ── Require JSDoc on exported functions ──────────────────────
      'jsdoc/require-jsdoc': ['warn', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
        checkConstructors: true,
        checkGetters: false,
        checkSetters: false,
      }],

      // ── Require @param tags ──────────────────────────────────────
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-name': 'warn',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'warn',

      // ── Require @returns tag ─────────────────────────────────────
      'jsdoc/require-returns': ['warn', {
        forceRequireReturn: false,
        forceReturnsWithAsync: false,
      }],
      'jsdoc/require-returns-type': 'warn',
      'jsdoc/require-returns-check': 'warn',
      'jsdoc/require-returns-description': 'off',

      // ── Validate tags match actual code ──────────────────────────
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',

      // ── Formatting ───────────────────────────────────────────────
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-indentation': 'off',
      'jsdoc/tag-lines': ['warn', 'never', { startLines: 1 }],
      'jsdoc/multiline-blocks': 'warn',
      'jsdoc/no-multi-asterisks': 'warn',

      // ── Description ──────────────────────────────────────────────
      'jsdoc/require-description': 'off',

      // ── Extras ───────────────────────────────────────────────────
      'jsdoc/no-undefined-types': 'off',  // too noisy without TS
      'jsdoc/valid-types': 'warn',
    },
  },

  // ── Relax JSDoc for test files ──────────────────────────────────
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
    },
  },
```

---

## Step 3 — JSDoc Format Standard

All new or updated exported functions must follow this JSDoc pattern:

```js
/**
 * Fetches a user profile by screen name.
 *
 * @param {string} screenName - The Twitter handle without @
 * @param {object} [options] - Optional configuration
 * @param {boolean} [options.includeFollowers] - Whether to include follower count
 * @returns {Promise<object>} The parsed user profile object
 * @throws {ScraperError} If the profile cannot be found
 */
export async function getProfile(screenName, options = {}) {
  // ...
}
```

### When JSDoc is NOT required

- Private/internal functions (not exported)
- Arrow functions assigned to variables (unless exported)
- Test functions (`describe`, `it`, `test` blocks)
- Browser scripts (`src/automation/`, `src/utils/core.js`)

---

## Step 4 — Verify

```bash
# Check plugin loads
npx eslint --print-config src/scrapers/twitter/index.js 2>&1 | grep 'jsdoc'

# Count JSDoc violations
npx eslint . 2>&1 | grep 'jsdoc/' | wc -l

# Show sample violations
npx eslint . 2>&1 | grep 'jsdoc/require-jsdoc' | head -10

# Verify tests are exempt
npx eslint --print-config tests/http-scraper/profile.test.js 2>&1 | grep 'jsdoc/require-jsdoc'
```

JSDoc violations will be warnings, not errors — they will not block `eslint` from passing. Functions will be documented in builds 07–12.

---

## Acceptance Criteria

- [ ] `eslint-plugin-jsdoc` installed as devDependency
- [ ] JSDoc rules added to ESLint config for Node.js source files
- [ ] `require-jsdoc` set to `warn` with `publicOnly: true`
- [ ] `require-param` and `require-returns` set to `warn`
- [ ] `check-param-names` set to `error` (existing JSDoc must be accurate)
- [ ] Test files exempt from JSDoc requirements
- [ ] Browser scripts (`src/automation/`, `src/utils/core.js`) NOT covered by JSDoc rules
- [ ] All JSDoc rules set to `warn` (not `error`) for incremental adoption
- [ ] ESLint runs without config errors after adding jsdoc plugin

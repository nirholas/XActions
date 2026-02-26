# Build 04-01 — Vitest Configuration & Coverage Setup

> **Modifies:** `vitest.config.js`, `package.json`
> **Creates:** `tests/setup.js`

---

## Task

Configure Vitest with proper coverage reporting, thresholds, test organization, and global setup.

---

## Current State

Read `vitest.config.js` and understand the existing config. The current setup likely has minimal configuration. We need:

1. Coverage provider and thresholds
2. Test path organization
3. Global setup file
4. Proper reporters

---

## File: `vitest.config.js`

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file discovery
    include: [
      'tests/**/*.test.js',
      'tests/**/*.spec.js',
    ],
    exclude: [
      'node_modules',
      'archive',
      'dashboard',
    ],

    // Global setup
    setupFiles: ['./tests/setup.js'],

    // Globals (describe, it, expect available without import)
    globals: true,

    // Environment
    environment: 'node',

    // Timeouts
    testTimeout: 30000, // Scraping tests may be slow
    hookTimeout: 15000,

    // Reporters
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './coverage/test-report.html',
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      enabled: true,
      
      // What to measure
      include: [
        'src/**/*.js',
        'api/**/*.js',
      ],
      exclude: [
        'src/mcp/server.js', // Too large for initial coverage — phased in
        'archive/**',
        'dashboard/**',
        'scripts/**',
        '**/*.test.js',
        '**/*.spec.js',
      ],

      // Thresholds
      thresholds: {
        lines: 60,      // Start at 60%, increase to 80% over time
        branches: 50,
        functions: 60,
        statements: 60,
      },

      // Reporters
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      
      // Show uncovered lines in terminal
      all: true,
    },

    // Pool configuration
    pool: 'forks', // Isolate tests to prevent cross-contamination
    poolOptions: {
      forks: {
        maxForks: 4,
      },
    },
  },
});
```

---

## File: `tests/setup.js`

```javascript
/**
 * Global test setup — runs before all test suites.
 * by nichxbt
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Prevent tests from making real HTTP requests
beforeAll(() => {
  // Mock fetch globally — individual tests can override
  if (!globalThis.fetch.__isMocked) {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      throw new Error(
        `Unmocked fetch call to ${url}. ` +
        `Use vi.mocked(fetch).mockResolvedValue() in your test.`
      );
    });
    globalThis.fetch.__isMocked = true;
  }
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.XACTIONS_LOG_LEVEL = 'error'; // Suppress logs during tests
process.env.XACTIONS_LOG_FILE = 'false';  // Don't write log files during tests

// Suppress console output during tests (optional, can be overridden)
if (process.env.XACTIONS_QUIET_TESTS !== 'false') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  beforeAll(() => {
    console.warn = vi.fn();
    console.error = vi.fn();
  });
  
  afterAll(() => {
    console.warn = originalWarn;
    console.error = originalError;
  });
}
```

---

## File: `package.json` script additions

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:api": "vitest run tests/api",
    "test:mcp": "vitest run tests/mcp",
    "test:cli": "vitest run tests/cli",
    "test:scrapers": "vitest run tests/scrapers"
  }
}
```

---

## Directory structure to create

```
tests/
  setup.js
  unit/
    .gitkeep
  integration/
    .gitkeep
  api/
    .gitkeep
  cli/
    .gitkeep
  mcp/
    .gitkeep
  scrapers/
    .gitkeep
  fixtures/
    .gitkeep
  helpers/
    .gitkeep
```

---

## Verification

```bash
# Run tests and confirm coverage report generates
npx vitest run --coverage

# Verify coverage HTML report exists
ls coverage/index.html

# Verify coverage thresholds are enforced
# (should fail if below thresholds)
```

---

## Acceptance Criteria
- [ ] vitest.config.js has coverage provider, thresholds, reporters
- [ ] Global setup file prevents unmocked fetch calls
- [ ] Package.json has full suite of test scripts
- [ ] Test directory structure created
- [ ] `npx vitest run --coverage` generates HTML + LCOV reports
- [ ] Coverage thresholds set at 60% starting point
- [ ] Existing tests still pass with new config

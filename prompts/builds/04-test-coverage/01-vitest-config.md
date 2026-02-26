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
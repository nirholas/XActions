// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ESLint flat config. Correctness only: undefined variables, unreachable code,
 * duplicate keys. Style is deliberately not enforced here.
 *
 * Run: npm run lint
 */
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'archive/**',
      'python/**',
      'xspace-agents/**',
      'dashboard/docs/**',
      'dashboard/scripts/**',
      // Generated bundle: scripts/build-toolkit.mjs concatenates the shell template with every script.
      'scripts/twitter/xactions-command-center.js',
      'pages-out/**',
      'dist/**',
      'dist-cloudflare/**',
      // Wrangler's dev and build scratch: bundled worker output, not source. Linting
      // it reported 20 no-redeclare errors from a minified bundle and made a green
      // lint run impossible for anyone who had run the site locally.
      '.wrangler/**',
      'coverage/**',
      '**/*.min.js',
      // Captured X bundles used as parser fixtures; not our code.
      'tests/**/fixtures/**',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      // Style-adjacent rules from "recommended" that this codebase does not follow yet.
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
      'no-control-regex': 'off',
      'no-async-promise-executor': 'off',
      'no-cond-assign': 'off',
      'no-fallthrough': 'off',
      'no-inner-declarations': 'off',
      'no-misleading-character-class': 'off',
      'no-case-declarations': 'off',
      'no-constant-condition': 'off',
      'no-useless-catch': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      // `(m || [, ''])[1]` is the regex-fallback idiom used throughout the browser scripts.
      'no-sparse-arrays': 'off',
      // A doc comment in scripts/build-all-docs.js names a zero-width space on purpose.
      'no-irregular-whitespace': ['error', { skipComments: true }],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.vitest } },
    rules: {
      // Fixtures carry 19-digit snowflake IDs as number literals on purpose: they mirror
      // the raw API payload, and the parser under test is what turns them into strings.
      'no-loss-of-precision': 'off',
    },
  },
  {
    files: ['extension/**/*.js'],
    languageOptions: { globals: { ...globals.webextensions } },
  },
  {
    // Dashboard pages load these from sibling <script> tags (js/config.js, CDN Chart.js, Socket.IO).
    files: ['dashboard/**/*.js'],
    languageOptions: {
      globals: {
        showToast: 'readonly',
        apiRequest: 'readonly',
        formatNumber: 'readonly',
        CONFIG: 'readonly',
        Chart: 'readonly',
        io: 'readonly',
        // Loaded from a script tag on the pages that render answers
        marked: 'readonly',
        DOMPurify: 'readonly',
      },
    },
    rules: {
      // js/config.js is where those page globals are defined.
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    // Console scripts pasted into DevTools on x.com: browser globals only, no Node.
    // Flat config merges `globals` across blocks, so the Node-only names the block
    // above grants are switched off here rather than merely left out.
    files: ['browser/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...Object.fromEntries(Object.keys(globals.node).map((name) => [name, 'off'])),
        ...globals.browser,
        ...globals.es2024,
      },
    },
  },
  {
    // Template that scripts/build-toolkit.mjs prepends with the CATALOG/CATEGORIES/TOOLS tables.
    files: ['scripts/twitter/_command-center-shell.js'],
    languageOptions: { globals: { CATALOG: 'readonly', CATEGORIES: 'readonly', TOOLS: 'readonly' } },
  },
];

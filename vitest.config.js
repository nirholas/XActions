import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The heaviest suites boot the whole Express app (about 200 routes) or a
    // real MCP server over an in-memory transport. Each passes comfortably on
    // its own, but four of them sharing the fork pool starved each other and
    // tripped a 30s hook timeout, which reads as a failure when it is only
    // contention. The ceilings are generous so a genuine hang still fails,
    // just later.
    testTimeout: 60000,
    hookTimeout: 120000,
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'archive'],
    reporters: ['verbose'],
    // Cap worker processes: an uncapped fork pool on a loaded machine produced
    // "Worker exited unexpectedly" crashes mid-suite.
    pool: 'forks',
    // Vitest 5 removed `poolOptions`; the cap is a top-level option now.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'archive/',
        'scripts/',
        '*.config.js',
      ],
    },
  },
});

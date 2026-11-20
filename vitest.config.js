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
    // Code under test that writes with an LLM uses the free lane chain, which
    // has keyless lanes and so would reach the network from any test. Off by
    // default; tests that exercise the chain pass their own env or stub fetch.
    env: { XACTIONS_LLM: 'off' },
    exclude: ['node_modules', 'dist', 'archive'],
    reporters: ['verbose'],
    // Cap worker processes: an uncapped fork pool on a loaded machine produced
    // "Worker exited unexpectedly" crashes mid-suite.
    pool: 'forks',
    // Vitest 5 removed `poolOptions`; the cap is a top-level option now.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      // Count every module, not just the ones some test happened to import:
      // without `include`, a file no test loads is invisible and the total
      // reads higher than it is.
      include: ['src/**/*.js', 'api/**/*.js'],
      exclude: [
        // Browser console scripts: pasted into DevTools, never loaded by Node.
        'src/automation/**',
      ],
      // A floor, not a target: set just under the measured numbers so a change
      // that drops coverage fails, and raised as tests are added.
      thresholds: {
        lines: 48,
        functions: 51,
        branches: 43,
        statements: 48,
      },
    },
  },
});

# XActions Improvement Master Orchestrator

> **Purpose:** Top-level agent prompt that coordinates all 10 improvement tracks. Each track has a research/plan prompt (`00-research-and-plan.md`) and 15 build prompts (`01-*.md` through `15-*.md`). This orchestrator defines execution order, dependencies, and integration gates.

---

## Context

**Repository:** `nirholas/XActions` — The complete X/Twitter automation toolkit  
**Stack:** Node.js (ESM), Puppeteer, Express, Prisma, Socket.IO, Commander CLI, MCP SDK  
**Current state:**
- 184 JS source files, 0 TypeScript files
- 952-line Puppeteer-based Twitter scraper (`src/scrapers/twitter/index.js`)
- 3,898-line MCP server (`src/mcp/server.js`) with 140+ tools
- 2,982-line CLI (`src/cli/index.js`) with 12 commands
- Zero `try/catch` in core scraper, zero retry logic, zero rate-limit handling
- 12 test files for 184 source files (~6.5% coverage)
- No ESLint/Prettier config
- Single 353-line `types/index.d.ts` stub
- npm package bundles entire platform (Remotion, Stripe, Redis, Bull)

---

## Execution Order (Dependency-Aware)

### Phase 1 — Foundation (No dependencies, run in parallel)
| Track | Directory | Why first |
|-------|-----------|-----------|
| **05 — Linting** | `05-linting/` | Establishes code quality baseline before mass changes |
| **03 — Error Handling** | `03-error-handling/` | Error classes are imported by every other track |

### Phase 2 — Core Infrastructure (Depends on Phase 1)
| Track | Directory | Depends on |
|-------|-----------|------------|
| **01 — HTTP Scraper** | `01-http-scraper/` | 03 (error classes), 05 (lint rules) |
| **04 — Test Coverage** | `04-test-coverage/` | 03 (error classes to test), 05 (lint) |

### Phase 3 — Auth & Type Safety (Depends on Phase 2)
| Track | Directory | Depends on |
|-------|-----------|------------|
| **06 — Cookie Auth** | `06-cookie-auth/` | 01 (HTTP scraper to use cookies with) |
| **08 — TLS Bypass** | `08-tls-bypass/` | 01 (HTTP scraper fetch layer) |
| **02 — TypeScript Migration** | `02-typescript-migration/` | 01, 03, 04 (stable APIs to type) |

### Phase 4 — Packaging & Documentation (Depends on Phase 3)
| Track | Directory | Depends on |
|-------|-----------|------------|
| **09 — npm Package Split** | `09-npm-package-split/` | 01, 02 (finalized module boundaries) |
| **07 — API Docs** | `07-api-docs/` | 02 (TypeScript types to document) |
| **10 — Community DX** | `10-community-dx/` | All tracks (final polish) |

---

## Integration Gates

After each phase, run these checks before proceeding:

```bash
# Phase 1 gate
npm run lint          # ESLint passes
npm run test          # Existing tests still pass

# Phase 2 gate
npm run test          # New scraper + error tests pass
node -e "import('xactions')"  # Library still imports

# Phase 3 gate
npm run test          # All tests pass including auth + TLS
npx tsc --noEmit      # TypeScript compilation succeeds

# Phase 4 gate
npm run lint && npm run test && npx tsc --noEmit
npm pack --dry-run    # Package size is reasonable (<5MB)
npm run docs          # API docs generate without errors
```

---

## Per-Track Structure

Each track directory contains:
- `00-research-and-plan.md` — Agent researches codebase, documents current state, produces architecture plan
- `01-*.md` through `15-*.md` — Ordered build prompts that each produce complete, working code

### Rules for Build Prompts
1. **No mock data** — Every file must be real, runnable code
2. **No stubs** — Every function must have a complete implementation
3. **No placeholders** — No `// TODO`, no `throw new Error('Not implemented')`
4. **Full integration** — Each build prompt must connect to existing XActions code
5. **Tests included** — Every build prompt that creates a module must include tests
6. **Backward compatible** — Existing `import {} from 'xactions'` must not break

---

## File Inventory

```
prompts/builds/
├── 00-master-orchestrator.md           (this file)
├── 01-http-scraper/
│   ├── 00-research-and-plan.md
│   ├── 01-graphql-endpoint-map.md
│   ├── 02-http-client-core.md
│   ├── 03-auth-token-manager.md
│   ├── 04-guest-token-flow.md
│   ├── 05-scrape-profile-http.md
│   ├── 06-scrape-tweets-http.md
│   ├── 07-scrape-followers-http.md
│   ├── 08-search-tweets-http.md
│   ├── 09-scrape-thread-http.md
│   ├── 10-post-tweet-http.md
│   ├── 11-like-retweet-follow-http.md
│   ├── 12-media-upload-http.md
│   ├── 13-dm-http.md
│   ├── 14-unified-scraper-adapter.md
│   └── 15-integration-tests-http.md
├── 02-typescript-migration/
│   ├── 00-research-and-plan.md
│   ├── 01-typescript-config.md
│   ├── 02-core-type-definitions.md
│   ├── 03-migrate-errors-to-ts.md
│   ├── 04-migrate-http-client-to-ts.md
│   ├── 05-migrate-scraper-modules-to-ts.md
│   ├── 06-migrate-actions-to-ts.md
│   ├── 07-migrate-auth-to-ts.md
│   ├── 08-migrate-puppeteer-scraper-to-ts.md
│   ├── 09-migrate-adapters-to-ts.md
│   ├── 10-migrate-mcp-server-to-ts.md
│   ├── 11-migrate-cli-to-ts.md
│   ├── 12-migrate-utils-plugins-to-ts.md
│   ├── 13-migrate-cross-platform-to-ts.md
│   ├── 14-strict-mode-audit.md
│   └── 15-type-coverage-report.md
├── 03-error-handling/
│   ├── 00-research-and-plan.md
│   ├── 01-error-class-hierarchy.md
│   ├── 02-error-codes-registry.md
│   ├── 03-retry-engine.md
│   ├── 04-rate-limit-manager.md
│   ├── 05-circuit-breaker.md
│   ├── 06-scraper-error-wrapping.md
│   ├── 07-cli-error-formatting.md
│   ├── 08-mcp-error-responses.md
│   ├── 09-api-error-middleware.md
│   ├── 10-graceful-degradation.md
│   ├── 11-error-telemetry.md
│   ├── 12-validation-layer.md
│   ├── 13-timeout-management.md
│   ├── 14-error-recovery-strategies.md
│   └── 15-error-handling-tests.md
├── 04-test-coverage/
│   ├── 00-research-and-plan.md
│   ├── 01-test-infrastructure.md
│   ├── 02-scraper-unit-tests.md
│   ├── 03-http-client-tests.md
│   ├── 04-error-class-tests.md
│   ├── 05-retry-engine-tests.md
│   ├── 06-rate-limit-tests.md
│   ├── 07-cli-command-tests.md
│   ├── 08-mcp-tool-tests.md
│   ├── 09-api-route-tests.md
│   ├── 10-auth-tests.md
│   ├── 11-automation-tests.md
│   ├── 12-plugin-tests.md
│   ├── 13-e2e-test-suite.md
│   ├── 14-snapshot-tests.md
│   └── 15-coverage-reporting.md
├── 05-linting/
│   ├── 00-research-and-plan.md
│   ├── 01-eslint-config.md
│   ├── 02-prettier-config.md
│   ├── 03-lint-staged-husky.md
│   ├── 04-import-order-rules.md
│   ├── 05-jsdoc-lint-rules.md
│   ├── 06-security-lint-rules.md
│   ├── 07-fix-scraper-lint.md
│   ├── 08-fix-cli-lint.md
│   ├── 09-fix-mcp-lint.md
│   ├── 10-fix-api-lint.md
│   ├── 11-fix-automation-lint.md
│   ├── 12-fix-utils-lint.md
│   ├── 13-editorconfig-vscode.md
│   ├── 14-ci-lint-workflow.md
│   └── 15-lint-audit-report.md
├── 06-cookie-auth/
│   ├── 00-research-and-plan.md
│   ├── 01-cookie-parser.md
│   ├── 02-cookie-store.md
│   ├── 03-cookie-encryption.md
│   ├── 04-session-manager.md
│   ├── 05-cookie-rotation.md
│   ├── 06-multi-account-cookies.md
│   ├── 07-browser-cookie-extract.md
│   ├── 08-cookie-health-check.md
│   ├── 09-cookie-cli-commands.md
│   ├── 10-cookie-mcp-tools.md
│   ├── 11-cookie-export-import.md
│   ├── 12-proxy-cookie-binding.md
│   ├── 13-cookie-refresh-flow.md
│   ├── 14-oauth2-pkce-flow.md
│   └── 15-cookie-auth-tests.md
├── 07-api-docs/
│   ├── 00-research-and-plan.md
│   ├── 01-jsdoc-annotations.md
│   ├── 02-typedoc-config.md
│   ├── 03-scraper-api-docs.md
│   ├── 04-cli-reference-docs.md
│   ├── 05-mcp-tool-docs.md
│   ├── 06-rest-api-openapi.md
│   ├── 07-examples-cookbook.md
│   ├── 08-getting-started-guide.md
│   ├── 09-architecture-docs.md
│   ├── 10-migration-guide.md
│   ├── 11-troubleshooting-guide.md
│   ├── 12-plugin-dev-guide.md
│   ├── 13-docs-site-generator.md
│   ├── 14-changelog-automation.md
│   └── 15-docs-ci-deploy.md
├── 08-tls-bypass/
│   ├── 00-research-and-plan.md
│   ├── 01-tls-fingerprint-research.md
│   ├── 02-custom-tls-client.md
│   ├── 03-ja3-fingerprint-spoof.md
│   ├── 04-http2-support.md
│   ├── 05-header-order-matching.md
│   ├── 06-browser-fingerprint-db.md
│   ├── 07-proxy-tls-tunneling.md
│   ├── 08-cloudflare-bypass.md
│   ├── 09-captcha-detection.md
│   ├── 10-fingerprint-rotation.md
│   ├── 11-tls-client-pool.md
│   ├── 12-request-timing-jitter.md
│   ├── 13-anti-detection-tests.md
│   ├── 14-stealth-benchmark.md
│   └── 15-tls-integration-tests.md
├── 09-npm-package-split/
│   ├── 00-research-and-plan.md
│   ├── 01-monorepo-setup.md
│   ├── 02-core-package.md
│   ├── 03-scraper-package.md
│   ├── 04-cli-package.md
│   ├── 05-mcp-package.md
│   ├── 06-api-package.md
│   ├── 07-dashboard-package.md
│   ├── 08-shared-types-package.md
│   ├── 09-plugin-sdk-package.md
│   ├── 10-dependency-pruning.md
│   ├── 11-workspace-scripts.md
│   ├── 12-publish-workflow.md
│   ├── 13-migration-codemod.md
│   ├── 14-backward-compat-shim.md
│   └── 15-package-split-tests.md
└── 10-community-dx/
    ├── 00-research-and-plan.md
    ├── 01-contributing-guide.md
    ├── 02-issue-templates.md
    ├── 03-pr-template.md
    ├── 04-ci-github-actions.md
    ├── 05-release-workflow.md
    ├── 06-security-policy.md
    ├── 07-code-of-conduct.md
    ├── 08-readme-overhaul.md
    ├── 09-examples-directory.md
    ├── 10-discord-bot.md
    ├── 11-onboarding-tutorial.md
    ├── 12-benchmarks-suite.md
    ├── 13-stale-bot-config.md
    ├── 14-sponsor-config.md
    └── 15-dx-audit-report.md
```

Total: 161 prompt files across 10 improvement tracks.

---

## How to Use

1. Start with Phase 1 tracks (05-linting, 03-error-handling)
2. For each track, first run `00-research-and-plan.md` — it produces architecture docs
3. Then run build prompts `01` through `15` in order
4. After completing all prompts in a phase, run the integration gate
5. Proceed to next phase

Each prompt is self-contained — an agent can execute it independently given the codebase context. Prompts reference specific files, line numbers, and function signatures from the current XActions codebase.

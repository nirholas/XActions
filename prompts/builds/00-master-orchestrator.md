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
│   └── 01-15 build prompts
├── 03-error-handling/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
├── 04-test-coverage/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
├── 05-linting/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
├── 06-cookie-auth/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
├── 07-api-docs/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
├── 08-tls-bypass/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
├── 09-npm-package-split/
│   ├── 00-research-and-plan.md
│   └── 01-15 build prompts
└── 10-community-dx/
    ├── 00-research-and-plan.md
    └── 01-15 build prompts
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

# 23: can the built-in SQLite replace the native dependency?

Read `prompts/dx/00-README.md` first. Wave 1. This is an evaluation with a decision at
the end; the swap happens only if the evidence supports it.

## Goal

Decide, with measurements, whether `better-sqlite3` can be replaced by Node's built-in
`node:sqlite`, and if it can, make the change behind one adapter with no behaviour
change.

## Why

`better-sqlite3` is a hard dependency and a native module. Every `npm install xactions`
and every cold `npx xactions-mcp` either downloads a prebuilt binary for the exact
platform and Node version or compiles one. When neither works the install fails before
the user has run anything. "It does not install or start" is already the most common
kind of bug report here (issues 9, 11, 36 and 87 were packaging faults, not this
module), so removing a native build step removes one more way to hit it. The project
already requires Node `>=22.19`, which may be new enough to use the built-in module
instead.

It is used in five modules:

```bash
grep -rln "better-sqlite3" src api --include=*.js
# src/agents/database.js
# src/scrapers/twitter/http/accountPool.js
# src/analytics/followerCRM.js
# src/analytics/historyStore.js
# src/client/auth/cookieImport.js
```

This prompt's premise is unverified. Establish the facts before writing code.

## Do

1. **Establish what `node:sqlite` is on the supported versions.** From the Node
   documentation for 22.19 and for 24 (CI runs both): is it available without a flag,
   what is its stability level, does it print a warning on import, and what is its API
   (`DatabaseSync`, prepared statements, transactions, `pragma`, user functions, BigInt
   handling, opening a file read-only, reading a database another process holds open)?
2. **List every `better-sqlite3` feature the five modules use.** Pay attention to
   `.transaction()`, `.pragma()` (WAL mode in particular), `.iterate()`,
   `safeIntegers`, read-only opens, and `cookieImport.js`, which reads browsers' own
   cookie databases, possibly while the browser has them locked.
3. **Compare.** A table of feature against support. For each gap, say whether a small
   shim closes it.
4. **Measure** the paths that matter with both drivers on the same data: account pool
   checkout and update under concurrency, a history store insert of a large batch, a CRM
   query. Report the numbers.
5. **Decide.** Recommend one of:
   - **swap**: no gaps that matter, no warning printed to users, performance acceptable;
   - **optional fallback**: keep `better-sqlite3` as an optional dependency and use the
     built-in when the native module fails to load, so an install never fails on it;
   - **stay**: gaps or instability make it not worth it. Then improve the failure
     instead: a clear message naming the fix, and a `doctor` check.
6. **Implement the recommendation** behind one adapter, `src/utils/sqlite.js`, that the
   five modules import. Run the existing tests for those modules against the adapter
   with each driver. Existing database files must open unchanged: test with a database
   created by the current code.
7. If the dependency moves or goes, update `package.json`, the `Dockerfile`, the
   `.mcpb` build (`scripts/build-mcpb.mjs`), `THIRD-PARTY-NOTICES.md` and
   `docs/troubleshooting.md`.

## Do not

- Do not swap on the strength of this prompt. Swap on the strength of steps 1 to 4.
- Do not ship a path that prints an experimental warning to every CLI user.
- Do not change a database schema or file location.

## Done when

- The report has the feature table, the measurements and the decision with its reason.
- Tests for all five modules pass on Node 22 and 24 with the chosen driver, including
  the existing-database test.
- `npm pack` followed by a clean install in a container with no build toolchain
  succeeds and `xactions doctor` reports SQLite as working; show it.

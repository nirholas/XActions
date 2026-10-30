# XActions: instructions for Copilot

**Read [AGENTS.md](../AGENTS.md).** It is the single source of truth for how to work in
this repository, and it is kept current. This file adds only what you need before you
suggest a change; it deliberately does not restate AGENTS.md, because the last time four
files described the repository they drifted apart.

- **Three runtime contexts, and code correct in one is broken in another.** Browser
  console scripts have no Node APIs. The library, CLI and MCP server are Node >= 22.19 ESM
  (CI runs 22 and 24). The API server is Express with Prisma and Redis. AGENTS.md
  has the table.
- **X's DOM changes constantly.** Prefer `data-testid` selectors; the current set is in
  [`docs/agents/selectors.md`](../docs/agents/selectors.md).
- **Never remove the delays between actions.** Every automation path paces itself on
  purpose. Removing that is how a user's account gets suspended. The MCP server also
  enforces per-account daily caps that survive a restart; do not route around them.
- **An empty result is an error, not a zero.** Read paths throw rather than reporting
  "0 results", because a silent zero looks exactly like an account with nothing on it.
- **Do not pin GraphQL query IDs.** They are discovered from x.com's own bundles and
  cached, and every request is signed with an `x-client-transaction-id` header. Both are
  load-bearing; a hand-rolled request that skips either gets a worse answer from X.
- **One licence: Apache-2.0.** `npm run check:licenses` enforces it, and anything adapted
  from another project is recorded in `THIRD-PARTY-NOTICES.md` first.
- **Tests are `npm test` (Vitest).** New behaviour needs a test; the suite
  runs offline. `npm run lint` and `npm run docs:check` also run in CI.

Everything else is in [AGENTS.md](../AGENTS.md).

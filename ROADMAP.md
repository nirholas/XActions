# Roadmap

> What XActions has, what is next, and what we have decided not to build.

**Version 3.5.0 · reviewed 2026-08-28.** Every "shipped" line below names the file that
implements it, so this page can be checked rather than believed. The previous version of
this file was last touched in January 2026 and still listed tweet scheduling and analytics
as "planning" long after both had shipped, alongside revenue targets for a paid product
that no longer exists. A roadmap nobody trusts is worse than no roadmap.

---

## Shipped

### Reading X without an API key
- Public reads over X's internal GraphQL API, no browser and no account: `src/scrapers/twitter/http/`
- Query IDs auto-discovered from x.com's own bundles, so a rotated ID self-heals instead of 404ing: `src/scrapers/twitter/http/queryIds.js`
- Requests signed with an `x-client-transaction-id` header computed the way x.com's own client computes it: `src/scrapers/twitter/http/transactionId.js`
- Cookies read straight from an installed browser, or from any common cookie export: `xactions login --from-browser`, `--cookies-file`
- Profiles, timelines, search, followers, following, threads, media, hashtags, bookmarks, likes
- Bluesky, Mastodon and Threads behind one normalised interface: `src/scrapers/`
- Import the official X data archive (the GDPR zip): `src/portability/twitter-archive.js`

### Automation
- Unfollow non-followers, unfollow everyone, detect unfollowers, follower alerts
- Auto-like, keyword follow, follow engagers, smart unfollow
- Mass block, mass unblock, mass unmute, leave all communities
- Engage a whole profile or an entire search: `scripts/engageProfile.js`, `scripts/searchSweep.js`
- Speed presets with jitter, rests and back-off on every bulk action
- Account pool with per-account, per-operation rate-limit windows read from X's own `x-rate-limit-*` headers, rotating on a 429 and locking on a 401: `src/scrapers/twitter/http/accountPool.js`
- Resumable scrapes: a cursor checkpoint written after every page, so a killed 50,000-follower job restarts where it stopped: `src/scrapers/twitter/http/checkpoint.js`
- Per-account daily action caps held on disk, so the budget survives a restart and an over-cap call is refused before it reaches X: `src/mcp/action-caps.js`
- 208 browser console scripts and an MV3 extension, for people who never open a terminal

### Agents
- MCP server: `src/mcp/server.js`, over stdio or Streamable HTTP on `/mcp` (`--http`, bearer auth via `XACTIONS_MCP_TOKEN`)
- A `.mcpb` bundle that installs the server into Claude Desktop with no config file: `scripts/build-mcpb.mjs`
- Approval gate: a write becomes a draft a human releases, via `XACTIONS_MCP_REQUIRE_APPROVAL`: `src/mcp/drafts.js`
- Tool allowlists so a host loads only what it needs: `src/mcp/tool-groups.js`
- A2A server, persona engine, workflow engine, plugin system
- An AI voice agent that joins and speaks in Spaces: `src/spaces/`
- `xactions skills install` wires the bundled skills into Claude Code, Cursor, Codex and Windsurf

### Analytics
- Engagement, growth and reputation reports: `src/analytics/`
- Best time to post, engagement leaderboard, competitor analysis, audience overlap
- Sentiment analysis offline by rule, or through an LLM behind the same interface

### Delivery
- Real-time streams for tweets, followers and mentions, persistent across restarts: `src/streaming/`
- x.com's own event pipeline, read as a chunked newline-delimited JSON response rather than the WebSocket it is not: `src/streaming/livePipeline.js`
- Signed outbound webhooks: HMAC-SHA256, timestamp, event type, stable delivery id, three retries and a replayable delivery log: `src/notifications/webhook.js`
- Email, Slack, Discord and Telegram notification channels: `src/notifications/`

### Writing
- Post, thread, reply, quote, poll, scheduled post, DM
- Thread composer and content calendar
- LLM-written replies through any provider, Ollama included: `src/ai/commentGenerator.js`

---

## Next

Ordered by how much they change what people can do, not by how easy they are.

### 1. Survive X changing its mind
The single largest risk to this project is a shipped release that stops working because
x.com moved something. Query-ID discovery covers one failure mode; these cover the rest.

- **Transport hardening.** Reads and writes should agree with whatever method X currently
  wants per endpoint, verified by a scheduled job against the live site rather than by a
  user's bug report. Related: issue #42.
- **A scheduled canary** that runs the real read paths against x.com daily and opens an
  issue by itself when one breaks. `scripts/verify-live.mjs` is the beginning of this.
- **TLS fingerprint impersonation** as an option for people X rate-limits harder.

### 2. Make an account last
An automation tool that gets you suspended has not helped you.

- **One rate ledger, not two.** The HTTP account pool tracks X's own `x-rate-limit-*`
  windows and `src/mcp/action-caps.js` holds the daily budget, but the browser-side
  `quotaSupervisor.js` still counts in-process and starts from zero on a restart. It
  should read the same on-disk ledger.
- **Dry-run by default** on every destructive bulk action.

### 3. Close the gap between "scrapes X" and "runs your presence"
- **A real scheduling queue**: durable drafts, timezone handling, thread scheduling, and
  fan-out to the Bluesky and Mastodon clients that already exist. Today `x_schedule_post`
  drives X's own compose UI, which needs Premium and a browser.
- **XChat**, X's encrypted DM system. The legacy DM endpoints go dark as migration
  completes, and `src/scrapers/twitter/http/dm.js` targets those. Reading and exporting
  your own conversations is the goal; bulk sending is not. Related: issue #37.
- **Follower audit** that scores an entire follower list (real, inactive, automated) and
  exports segments, rather than the per-page heuristic in `x_detect_bots`.

### 4. Meet people where they are
- **Chrome Web Store and Edge Add-ons listings.** The extension is Manifest V3 and
  load-unpacked only, so "no console needed" is not yet true for the people who need it
  most. There is no Firefox build; a port would come after the two Chromium stores.
- **Homebrew tap and release binaries**, so installing does not require a Node toolchain.
- **An optional official-API lane** (OAuth2 PKCE) for users who would rather pay X than
  risk a suspension. Not the default, and never required.

---

## Deliberately not building

Recording these saves everyone the conversation twice.

| Not building | Why |
|---|---|
| Auto-DM campaigns | X's rules prohibit unsolicited automated DMs, and it is the fastest route to a permanent suspension. Reading and exporting your own DMs is fine; blasting strangers is not. |
| Engagement pods and reply rings | Manipulation. It also stops working the moment it is detected, so it is a bad product on top of a bad idea. |
| Follower or view purchasing | Same. |
| A hosted service that scrapes X on other people's behalf | X sent cease-and-desist letters over exactly this in August 2026. XActions runs on your machine, with your session, at your discretion. See SECURITY.md. |
| Auto-retweet everything | Trivially easy, uniformly spammy. |

---

## Contributing

The "Next" list is the best place to start, and every item names the file it would touch.
Open PRs are reviewed against this page: if a change moves a "Next" item to "Shipped", say
so in the description and update this file in the same PR.

See [CONTRIBUTING.md](CONTRIBUTING.md). Questions: [@nichxbt](https://x.com/nichxbt).

# XActions — Agent Instructions

> X/Twitter automation toolkit: browser scripts, CLI, Node.js library, MCP server, web dashboard. No API fees. By nichxbt.

## Quick Reference

| User Request | Solution |
|---|---|
| Unfollow everyone | `src/unfollowEveryone.js` |
| Unfollow non-followers | `src/unfollowback.js` |
| Download Twitter video | `scripts/videoDownloader.js` |
| Detect unfollowers | `src/detectUnfollowers.js` |
| Train algorithm for a niche | `src/automation/algorithmBuilder.js` (browser) or `xactions persona create` (CLI) |
| Become a thought leader / grow account | `skills/algorithm-cultivation/SKILL.md` |
| 24/7 LLM-powered growth agent | `src/algorithmBuilder.js` + `src/personaEngine.js` — run via `xactions persona run <id>` |
| Create a persona for automation | `xactions persona create` or MCP tool `x_persona_create` |
| Twitter automation without API | XActions uses browser automation |
| MCP server for Twitter | `src/mcp/server.js` |

## Project Structure

```
src/           → Core scripts, automation/, scrapers/, cli/, mcp/
api/           → Express.js backend (routes/, services/, middleware/)
dashboard/     → Static HTML frontend
scripts/       → Standalone utility scripts
skills/        → 31 Agent Skills (skills/*/SKILL.md)
docs/          → Documentation and examples
archive/       → Legacy browser-only scripts
prisma/        → Database schema
bin/           → CLI entry point (unfollowx)
extension/     → Browser extension (Chrome/Edge)
```

## Skills

32 skills in `skills/*/SKILL.md`. Read the relevant SKILL.md when a user's request matches a category.

- **Hermes integration** — `skills/hermes-integration/SKILL.md` — content pipeline from Hermes to X/Twitter

- **Unfollow management** — mass unfollow, non-follower cleanup
- **Analytics & insights** — engagement, hashtags, competitors, best times
- **Content posting** — tweets, threads, polls, scheduling, reposts
- **Twitter scraping** — profiles, followers, tweets, media, bookmarks
- **Growth automation** — auto-like, follow engagers, keyword follow
- **Algorithm cultivation** — thought leader training, niche optimization
- **Community management** — join/leave communities
- **Follower monitoring** — follower alerts, continuous tracking
- **Blocking & muting** — bot blocking, bulk mute
- **Content cleanup** — delete tweets, unlike, clear history
- **Direct messages** — auto DM, message management
- **Bookmarks** — export, organize, folder management
- **Lists** — create, manage, bulk add members
- **Profile management** — edit profile, avatar, header, bio
- **Settings & privacy** — protected tweets, notification preferences
- **Notifications management** — filtering, auto-response, notification controls
- **Engagement & interaction** — auto-reply, auto-repost, plug replies
- **Discovery & explore** — trending, topics, search
- **Premium & subscriptions** — subscription features
- **Spaces & live** — create, join, schedule spaces
- **Grok AI** — chat, image generation
- **Articles & longform** — compose, publish articles
- **Business & ads** — campaigns, boosts, ads dashboard
- **Creator monetization** — revenue, analytics
- **Community health monitoring** — follower quality audits, engagement authenticity
- **Competitor intelligence** — competitor profile, content, and audience analysis
- **Content repurposing** — repackage top tweets into threads, carousels, variations
- **Lead generation** — find and qualify B2B leads from X conversations
- **Viral thread generation** — research trends and generate high-engagement threads
- **XActions CLI** — `bin/unfollowx` command-line tool
- **XActions MCP server** — `src/mcp/server.js` for AI agents

## Key Technical Context

- Browser scripts run in **DevTools console on x.com**, not Node.js
- DOM selectors change frequently — see [selectors.md](docs/agents/selectors.md)
- Scripts in `src/automation/` require pasting `src/automation/core.js` first
- State persistence uses `sessionStorage` (lost on tab close)
- CLI entry point: `bin/unfollowx`, installed via `npm install -g xactions`
- MCP server: `src/mcp/server.js` — used by Claude Desktop and AI agents
- Prefer `data-testid` selectors — most stable across X/Twitter UI updates
- X enforces aggressive rate limits; all automation must include 1-3s delays between actions

## Patterns & Style

- Browser script patterns: [browser-script-patterns.md](docs/agents/browser-script-patterns.md)
- Adding features: [contributing-features.md](docs/agents/contributing-features.md)
- DOM selectors (verified January 2026): [selectors.md](docs/agents/selectors.md)
- `const` over `let`, async/await, emojis in `console.log`
- Author credit: `// by nichxbt`

## Codespace Performance

```bash
ps aux --sort=-%cpu | head -20    # See top CPU consumers
pkill -f "vitest"                  # Kill vitest workers
pkill -f "tsgo --noEmit"          # Kill type-checker
```

Common resource hogs: `tsgo --noEmit` (~500% CPU), vitest workers (15x ~100% CPU each), multiple tsserver instances.

## Terminal Management

- Always use background terminals (`isBackground: true`) for every command
- Always kill the terminal after the command completes
- Do not reuse foreground shell sessions — stale sessions block future operations
- If a terminal appears unresponsive, kill it and create a new one

## Hermes Integration

This repo is integrated with Hermes Agent for AI-powered content generation and posting.

### Content Pipeline

1. Hermes generates security content (vulnerability threads, exploit analysis)
2. All content is deslopped (no AI patterns, em dashes, hedging)
3. Hermes sends content to the user for approval via Telegram
4. Approved content is posted via XActions browser automation
5. **Nothing auto-posts without explicit user approval**

### Key Files

| File | Purpose |
|------|---------|
| `skills/hermes-integration/SKILL.md` | Full integration guide |
| `scripts/hermes-poster.js` | Format content for XActions posting |
| `.env.example` | Environment variable template |

### Environment

- `.env` is in `.gitignore` — never commit secrets
- Session cookies go in `.env`, referenced as `XACTIONS_SESSION_COOKIE`
- Content directory: `~/.hermes/cron/output/`

## Mandatory Rules

1. **Never mock, stub, or fake anything.** Real implementations only.
2. **TypeScript strict mode** — no `any`, no `@ts-ignore`.
3. **Always kill terminals** after commands complete.
4. **Always commit and push** as `nirholas`.
5. **Never commit `.env` files, session cookies, or API keys.**
6. **Never auto-post content without explicit user approval.**

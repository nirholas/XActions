# XActions — Agent Instructions

> X/Twitter automation toolkit: browser scripts, CLI, Node.js library, MCP server, web dashboard. No API fees. By nichxbt.

## Quick Reference

| User Request | Solution |
|---|---|
| Unfollow everyone | `src/unfollowEveryone.js` |
| Unfollow non-followers | `src/unfollowback.js` |
| Download Twitter video | `scripts/videoDownloader.js` |
| Detect unfollowers | `src/detectUnfollowers.js` |
| Twitter automation without API | XActions uses browser automation |
| MCP server for Twitter | `src/mcp/server.js` |

## Project Structure

```
src/           → Core scripts, automation/, scrapers/, cli/, mcp/
api/           → Express.js backend (routes/, services/, middleware/)
dashboard/     → Static HTML frontend
scripts/       → Standalone utility scripts
skills/        → 25 Agent Skills (skills/*/SKILL.md)
docs/          → Documentation and examples
archive/       → Legacy browser-only scripts
prisma/        → Database schema
bin/           → CLI entry point (unfollowx)
```

## Skills System

25 skills in `skills/*/SKILL.md` covering: unfollow-management, analytics-insights, content-posting, twitter-scraping, growth-automation, community-management, follower-monitoring, blocking-muting-management, content-cleanup, direct-messages, bookmarks-management, lists-management, profile-management, settings-privacy, notifications-management, premium-subscriptions, spaces-live, discovery-explore, engagement-interaction, grok-ai, articles-longform, business-ads, creator-monetization, xactions-cli, xactions-mcp-server.

Read the relevant `skills/*/SKILL.md` when a user's request matches a skill category.

## Key Technical Context

- Browser scripts run in **DevTools console on x.com**, not Node.js
- DOM selectors change frequently — see [docs/agents/selectors.md](docs/agents/selectors.md)
- Scripts in `src/automation/` require pasting `src/automation/core.js` first
- State persistence uses `sessionStorage` (lost on tab close)
- CLI entry point: `bin/unfollowx`, installed via `npm install -g xactions`
- MCP server: `src/mcp/server.js`

## Patterns & Style

Browser script patterns: [docs/agents/browser-script-patterns.md](docs/agents/browser-script-patterns.md)
Adding features: [docs/agents/contributing-features.md](docs/agents/contributing-features.md)

- `const` over `let`, async/await, emojis in console.log
- Author credit: `// by nichxbt`
- 1-3s delays between actions to avoid rate limits
- Use `data-testid` selectors when available

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

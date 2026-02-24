# XActions

X/Twitter automation toolkit: browser scripts, CLI, Node.js library, MCP server, dashboard.
By nichxbt. MIT license. No Twitter API fees — uses browser automation.

## Architecture

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

## Skills

26 skills in `skills/*/SKILL.md`: unfollow-management, analytics-insights, content-posting, twitter-scraping, growth-automation, algorithm-cultivation, community-management, follower-monitoring, blocking-muting-management, content-cleanup, direct-messages, bookmarks-management, lists-management, profile-management, settings-privacy, notifications-management, premium-subscriptions, spaces-live, discovery-explore, engagement-interaction, grok-ai, articles-longform, business-ads, creator-monetization, xactions-cli, xactions-mcp-server.

Read the relevant SKILL.md when a request matches a skill category.

## Technical Context

- Browser scripts run in **DevTools console on x.com**, not in Node.js
- DOM selectors change — see `docs/agents/selectors.md` for verified selectors (Jan 2026)
- Scripts in `src/automation/` require pasting `src/automation/core.js` first
- State persistence: `sessionStorage` (lost on tab close)
- CLI: `bin/unfollowx` → `npm install -g xactions`
- MCP server: `src/mcp/server.js`

## Code Conventions

- `const` over `let`, async/await
- Author credit: `// by nichxbt`
- Console logs use emojis for visibility
- 1-3s sleep between actions to avoid rate limits
- Use `data-testid` selectors when available

## References

- DOM selectors: `docs/agents/selectors.md`
- Script patterns: `docs/agents/browser-script-patterns.md`
- Adding features: `docs/agents/contributing-features.md`
- Style & contributing: `CONTRIBUTING.md`

## Codespace Performance

```bash
ps aux --sort=-%cpu | head -20    # Top CPU consumers
pkill -f "vitest"                  # Kill vitest workers
pkill -f "tsgo --noEmit"          # Kill type-checker
```

Common resource hogs: `tsgo --noEmit` (~500% CPU), vitest workers (~100% CPU each).

## Terminal Management

- Always use background terminals (`isBackground: true`)
- Always kill the terminal after command completes
- Do not reuse foreground shell sessions — stale sessions block operations
- If a terminal appears unresponsive, kill and create a new one

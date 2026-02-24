# XActions

> ⚡ The Complete X/Twitter Automation Toolkit — Scrapers, MCP server for AI agents (Claude/GPT), CLI, browser scripts. No API fees. Open source. Unfollow people who don't follow back. Monitor real-time analytics. Auto follow, like, comment, scrape, without API.

### Codespace Performance

If Codespace becomes slow, check and kill resource-heavy processes:

```bash
# See top CPU consumers
ps aux --sort=-%cpu | head -20

# Kill vitest workers
pkill -f "vitest"

# Kill type-checker (tsgo)
pkill -f "tsgo --noEmit"

# Force-kill a specific process by PID
kill -9 <PID>
```

Common resource hogs: `tsgo --noEmit` (~500% CPU), vitest workers (15x ~100% CPU each), multiple tsserver instances

### Terminal Management

- **Always use background terminals** (`isBackground: true`) for every command so a terminal ID is returned
- **Always kill the terminal** after the command completes, whether it succeeds or fails — never leave terminals open
- Do not reuse foreground shell sessions — stale sessions block future terminal operations in Codespaces
- In GitHub Codespaces, agent-spawned terminals may be hidden — they still work. Do not assume a terminal is broken if you cannot see it
- If a terminal appears unresponsive, kill it and create a new one rather than retrying in the same terminal

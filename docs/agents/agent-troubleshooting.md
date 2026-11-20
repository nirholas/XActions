# Agent Troubleshooting Guide

Common issues agents encounter when working on XActions and how to resolve them.

---

## Tests

### Tests fail with "Task not found: undefined"
**Cause:** `TaskStore` methods are async — calling `store.create()` without `await` returns a Promise, not a task object. Passing the Promise as a task ID fails.
**Fix:** Add `await` to all `store.create()`, `store.get()`, `store.transition()`, `store.list()` calls. Make test callbacks `async`.

### Integration test worker crashes / times out
**Cause:** Usually an infinite pagination loop. `scrapeUserList` loops `while (seen.size < limit)`. If the mock always returns the same response with a cursor and `seen.size` never reaches `limit`, it loops forever.
**Fix:** Use a call counter in the mock. Return a no-cursor response after the first call per endpoint:
```js
let callCount = 0;
const fetchMock = vi.fn(async (url) => {
  if (url.includes('Followers')) {
    callCount++;
    if (callCount > 1) return mockResponse({}); // no cursor → terminates
    return mockResponse(graphqlBody(FOLLOWERS_RESPONSE));
  }
});
```

### x402-integration tests fail with 429 instead of 402
**Cause:** These tests require a running API server. Without the server, they hit a different endpoint.
**Fix:** Start the server first: `npm run dev`. Then run: `npx vitest run tests/x402-integration.test.js`.

### Mutation mock returns wrong shape
**Cause:** For GraphQL **queries**, `client.graphql()` wraps the response as `{ data: json, cursor }`. For **mutations** (`mutation: true`), it returns the raw JSON directly.
**Fix:** For mutation mocks, pass the full fixture *with* the `data` wrapper: `mockResponse(TWEET_CREATE_RESPONSE)`, not `mockResponse(graphqlBody(TWEET_CREATE_RESPONSE))`.

### Media upload test: "Cannot read properties of undefined (reading 'processing_info')"
**Cause:** `MEDIA_FINALIZE_RESPONSE` includes `processing_info`, which triggers a STATUS poll call. The mock has no response for this extra call, so it returns `undefined`.
**Fix:** Add a STATUS mock after FINALIZE: `.mockResolvedValueOnce({})`. The `pollProcessingStatus` function returns immediately when `processing_info` is absent.

---

## MCP Server

### MCP server crashes on startup
1. Check `XACTIONS_SESSION_COOKIE` is set in environment
2. Verify Node.js version ≥ 18: `node --version`
3. Check import errors: `node src/mcp/server.js` directly
4. Review `docs/mcp-setup.md` for full setup

### MCP tool returns "not authenticated"
**Cause:** Session cookie expired or missing.
**Fix:** Get a fresh `auth_token` cookie from DevTools → Application → Cookies → `auth_token` on x.com. Set as `XACTIONS_SESSION_COOKIE`.

### MCP tool times out
**Cause:** Puppeteer can't launch (missing Chrome/Chromium) or x.com is blocking automation.
**Fix:**
```bash
npx puppeteer browsers install chrome
# Or set PUPPETEER_HEADLESS=false to debug visually
```

---

## Browser Scripts

### "No unfollow buttons found" or script finds nothing
1. Verify you're on the correct page (`x.com/USERNAME/following`, not `/followers`)
2. Check selectors in `docs/agents/selectors.md` — X changes DOM frequently
3. Try scrolling manually first to trigger lazy loading
4. Use `data-testid` selectors — most stable

### Script stops after ~20 actions
**Cause:** X rate limit triggered.
**Fix:** Wait 30–60 minutes. Reduce actions per session. Increase delays (1–3s minimum between actions).

### "core.js not defined" errors
**Cause:** Scripts in `src/automation/` require `src/automation/core.js` to be pasted first.
**Fix:** Copy and paste `src/automation/core.js` into DevTools, then paste the automation script.

---

## CLI

### `xactions` command not found after install
```bash
npm install -g xactions
# Or from source:
npm link
```

### CLI persona commands fail
1. Check `XACTIONS_SESSION_COOKIE` env var
2. For LLM features: they use free models; if every lane is rate limited, add a free-tier key (`GROQ_API_KEY`, `NVIDIA_API_KEY` or `OPENROUTER_API_KEY`)
3. Run `xactions persona list` to verify setup

---

## Database / API Server

### Prisma errors on startup
```bash
npx prisma migrate dev    # Apply pending migrations
npx prisma db push        # Push schema changes without migration
```

### "Cannot connect to database"
1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `.env`
3. For local dev: `docker-compose up -d postgres redis`

### "Cannot connect to Redis"
1. Verify Redis is running
2. Check `REDIS_HOST` and `REDIS_PORT` in `.env`
3. Bull job queue requires Redis — MCP server works without it

---

## Performance (Codespace)

If tests are slow or the codespace is unresponsive:

```bash
# Kill resource hogs
pkill -f "tsgo --noEmit"    # TypeScript checker (~500% CPU)
pkill -f "vitest"            # Leftover test workers
```

Run tests one file at a time rather than the full suite when memory is constrained:
```bash
npx vitest run tests/specific/test.js
```

---

## Common Gotchas

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `require` is not defined | ESM-only project (`"type":"module"` in package.json) | Use `import`/`export` only |
| `window` is not defined | Browser script running in Node.js | Browser scripts are console-only; Node.js alternatives are in `src/scrapers/` |
| Selector stopped working | X/Twitter changed DOM | Check `docs/agents/selectors.md`; use DevTools to find new `data-testid` |
| Rate limit after few actions | No delay between actions | Add `await sleep(1000 + Math.random() * 2000)` between each action |
| Puppeteer hangs | Headless Chrome issue | Set `PUPPETEER_HEADLESS=false` to debug; check `docs/troubleshooting.md` |

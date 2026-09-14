# The hosted MCP server

> Give any AI agent live access to public X/Twitter with one URL. No API key, no account, no install.

```
https://xactions.app/mcp
```

That is the whole setup. Paste it into Claude Code, Claude Desktop, Cursor, VS Code or Windsurf and your agent can read profiles, posts, threads and videos from X, and search the entire XActions documentation while it writes automation code.

There is nothing to sign up for. X's own API costs $200 a month for the tier that reads a timeline. This reads the same public data through the rails x.com serves to logged-out browsers, from a Cloudflare edge worker.

Four of the six tools are free. The two that mirror the site's paid REST endpoints, `x_profile` and `x_posts`, cost a fraction of a cent per call, paid in USDC over [x402](x402.md) at the moment you call them. There is still no account, no key and no invoice: the payment is the identity.

## Add it to your client

### Claude Code

```bash
claude mcp add --transport http xactions https://xactions.app/mcp
```

Then ask it something: *"what has @nasa been posting about this week?"*

### Claude Desktop

Settings, then Connectors, then Add custom connector, and paste the URL. Or edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xactions": {
      "type": "http",
      "url": "https://xactions.app/mcp"
    }
  }
}
```

### Cursor

`.cursor/mcp.json` in your project, or the global one in `~/.cursor/`:

```json
{
  "mcpServers": {
    "xactions": {
      "url": "https://xactions.app/mcp"
    }
  }
}
```

### VS Code (GitHub Copilot agent mode)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "xactions": {
      "type": "http",
      "url": "https://xactions.app/mcp"
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "xactions": {
      "serverUrl": "https://xactions.app/mcp"
    }
  }
}
```

### Anything else

The server speaks **Streamable HTTP** (MCP `2025-06-18`, back-compatible with `2025-03-26` and `2024-11-05`). Any client that supports remote MCP servers works. It is stateless, so there is no session to keep alive and no reconnect logic to get wrong.

```bash
curl -s https://xactions.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Discovery lives at [`/.well-known/mcp.json`](https://xactions.app/.well-known/mcp.json), and `GET /mcp` with `Accept: application/json` returns the same descriptor.

## Tools

| Tool | What it does | Price |
|---|---|---|
| `x_post` | One post in full, including long-form text, every public metric, media URLs, entities and the quoted post | free |
| `x_thread` | The conversation around a post: up to the root, and down through the author's continuation | free |
| `x_video` | Every downloadable MP4 for a post, best quality first, with a ready download link | free |
| `xactions_docs` | Search the XActions guides, tutorials, CLI and API reference, 50 skills and every browser script | free |
| `x_profile` | Public profile for an account: bio, counts, links, join date, verification, pinned post | $0.001 |
| `x_posts` | Recent posts for an account, newest first, with text, timestamps, metrics and media | $0.005 |

Prices are per call, in USDC, and there is still no account: see
[Paying for the priced tools](#paying-for-the-priced-tools). Read the live price
list from the server rather than from this table, which can rot:

```bash
curl -s https://xactions.app/mcp -H 'accept: application/json' | jq '.tools[] | {name, price}'
```

Every tool is read-only. Nothing in this server can post, follow, like, delete, or touch an account.

`x_post` returns `views` and `bookmarks` from the richer rail. When x.com throttles it, the server falls back to the public embed endpoint, `source` reads `syndication` instead of `graphql`, and those two fields read `0`. Everything else is identical.

## Paying for the priced tools

An unpaid call to `x_profile` or `x_posts` comes back as a tool error whose text
is the x402 payment terms: the price, and the chains and addresses that settle
it (USDC on Solana or Base). Pay, then call again.

Agents that already speak x402 handle this on their own. From JavaScript, the
SDK turns it into a typed error with the terms attached:

```js
import { createClient, PaymentRequiredError } from 'xactions-edge';

try {
  await createClient().profile('nasa');
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    error.price;    // '$0.001'
    error.chains;   // ['Solana', 'Base']
    error.accepts;  // the raw x402 terms to sign against
  }
}
```

`await client.prices()` returns the current price of every tool, so a caller can
budget before it starts. Free tools report `null`.

Full protocol details: [x402 payments](x402.md).

## Resources

The server publishes the whole XActions corpus as MCP resources, roughly 700 of them: one per documentation page, agent skill, and browser script.

```
xactions://doc/docs/video-downloader.md
xactions://skill/skills/algorithm-cultivation/SKILL.md
xactions://script/src/unfollowEveryone.js
```

`xactions_docs` finds the right passage; a resource read pulls the whole file. Agents that support resource attachment can pin one into context.

## Prompts

Five prompt templates ship with the server. In Claude Code they show up as slash commands.

| Prompt | Arguments | Result |
|---|---|---|
| `audit_account` | `handle`, `goal` | Profile plus 50 posts, what beats the median by 3x, three changes to make |
| `read_thread` | `post` | The thread's claim, its supporting points in order, what it asserts without evidence |
| `competitor_scan` | `handles`, `angle` | Accounts side by side on cadence, format and engagement per follower |
| `save_video` | `post` | Every quality available, with the best download link |
| `automate_this` | `task` | The XActions surface that already does it, with real flags from the docs |

## From JavaScript instead of an agent

The same server, as an ordinary SDK:

```bash
npm install xactions-edge
```

```js
import { createClient } from 'xactions-edge';
const x = createClient();

const nasa = await x.profile('nasa');
const thread = await x.thread('https://x.com/SpaceX/status/2092648130856571283');
const mp4 = await x.videoUrl(thread.focal.url);
```

Zero dependencies, and it runs in Node, browsers, Cloudflare Workers, Deno and Bun. Full reference: [packages/xactions-edge](https://github.com/nirholas/XActions/tree/main/packages/xactions-edge).

One-line reads from a terminal, with nothing installed:

```bash
npx xactions-edge posts nasa --limit 5
```

## How it works

```
your agent
    |  MCP over Streamable HTTP
    v
xactions.app/mcp            Cloudflare Pages Function, runs at the edge
    |
    +-- guest-token GraphQL      x.com's own logged-out API, full metrics
    +-- cdn.syndication.twimg    the endpoint the embed widget calls, no token
    +-- /data/ask-index.json     the docs corpus, shipped as a static asset
```

No database. No browser. No origin server. No credential anywhere in the request path, which is why there is nothing to sign up for and nothing that can leak.

Each rail covers the other's failure mode: the guest lane carries every public metric but x.com rate-limits it, and the syndication endpoint has fewer fields but almost never refuses. A read only fails when both do.

Successful reads are cached at the Cloudflare edge, so the second person to ask about a post gets it without another round trip to x.com.

## Limits

- **Public data only.** Protected accounts, DMs, and anything behind a login are not readable, by design.
- **Reads only.** Writing to X needs your own session. That is what the [local MCP server](mcp-setup.md) is for, with 154 tools including posting, following and scheduling.
- **`x_thread` continues downward only as far as the author's recent timeline reaches.** It always walks up to the root, at any age. When the tail is out of reach it returns `truncated: true` rather than implying the thread ended.
- **Anonymous rate limits are x.com's, not ours.** When they bite, calls fail with a message saying to wait about a minute. They recover on their own.
- **Two tools are priced.** `x_profile` and `x_posts` answer an unpaid call with x402 terms rather than data. The other four are free.
- **Do not point a bulk crawler at a shared free endpoint.** The whole server is Apache-2.0. Deploy your own copy and point your client at it: `functions/mcp.js` plus `src/mcp/` is the entire thing.

## Run your own

```bash
git clone https://github.com/nirholas/XActions
cd XActions && npm install
npx wrangler pages dev dashboard
```

`http://127.0.0.1:8788/mcp` is now the same server. Deploy it to your own Cloudflare Pages project and it costs nothing to run: the free tier covers 100,000 requests a day.

## Related

- [Local MCP server](mcp-setup.md): 154 tools, write access, your own session
- [Video downloader](video-downloader.md): the same extraction lanes, as a web page and a REST endpoint
- [Cloudflare Pages Functions](https://github.com/nirholas/XActions/tree/main/functions): every endpoint xactions.app serves at the edge

---

*by nichxbt*

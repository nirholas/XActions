# xactions-edge

Public X/Twitter reads from any JavaScript runtime. **No API key. No account. No install on a server somewhere.**

Four of the six reads are free. Two (`profile` and `posts`) cost a fraction of a cent per call, settled in USDC over x402 with no signup: see [Priced reads](#priced-reads).

```bash
npm install xactions-edge
```

```js
import { createClient } from 'xactions-edge';

const x = createClient();

const nasa = await x.profile('nasa');
//  { username: 'NASA', followers: 92356634, description: '...', ... }

const posts = await x.posts('SpaceX', { limit: 10 });
const post  = await x.post('https://x.com/SpaceX/status/2092648130856571283');
const thread = await x.thread(post.url);
const mp4   = await x.videoUrl(post.url);
```

Zero dependencies. Runs unchanged in **Node 18+, browsers, Cloudflare Workers, Deno and Bun**. The only requirement is `fetch`.

## Try it without installing anything

```bash
npx xactions-edge profile nasa
npx xactions-edge post https://x.com/SpaceX/status/2092648130856571283
npx xactions-edge video https://x.com/SpaceX/status/2092648130856571283 --save clip.mp4
npx xactions-edge docs "how do I unfollow everyone"
```

Add `--json` to any command for the raw object.

## What it talks to

`xactions.app/mcp` is a hosted [Model Context Protocol](https://modelcontextprotocol.io) server that runs at the edge on Cloudflare. Agents connect to it with a URL. This package is the other door into the same server: plain methods for people writing plain JavaScript, speaking MCP underneath so there is exactly one implementation to keep correct.

Reads come from x.com's public rails (the guest-token GraphQL API and the endpoint the official embed widget calls), with automatic failover between them. Nothing here logs in, and nothing here writes: no posting, no following, no deleting.

## API

### `createClient(options?)`

| Option | Default | What it does |
|---|---|---|
| `endpoint` | `https://xactions.app/mcp` | Point at your own deployment |
| `timeout` | `20000` | Per-request timeout in ms |
| `retries` | `2` | Retries on timeout, rate limit, and 5xx, with exponential backoff |
| `fetch` | global | Inject a fetch, for tests or a proxy |
| `headers` | `{}` | Extra headers on every request |

### Reads

```js
await x.profile('nasa');
// id, username, name, description, location, website, followers,
// following, tweets, createdAt, verified, avatar, banner, pinnedTweetId

await x.posts('nasa', { limit: 50 });
// [{ id, url, createdAt, text, metrics: { likes, reposts, replies, views }, isReply, media }]

await x.post('https://x.com/SpaceX/status/2092648130856571283');
// { id, url, createdAt, lang, text, author, metrics, media, entities,
//   conversationId, replyTo, quoted, possiblySensitive, source }

await x.thread(url, { limit: 25 });
// { focal, posts: [...], author, truncated }

await x.video(url);
// { videos: [{ url, quality, width, height, bitrate, downloadUrl }], thumbnail, duration }

await x.videoUrl(url);
// the best-quality download link, ready for a browser or a file writer

await x.docs('how do I schedule a thread', { limit: 6 });
// [{ title, url, path, kind, text, score }] from the XActions docs, skills and scripts
```

`metrics.views` and `metrics.bookmarks` come from the richer rail; when x.com throttles it and the client falls back, `source` says `'syndication'` and those two read `0`. Everything else is identical on both rails.

### Priced reads

`profile()` and `posts()` cost money: $0.001 and $0.005 per call, in USDC on
Solana or Base. Everything else is free. An unpaid call raises a
`PaymentRequiredError` carrying the terms, so a payment client has everything it
needs to settle and retry.

```js
import { createClient, PaymentRequiredError } from 'xactions-edge';

const x = createClient();

await x.prices();
// { x_profile: '$0.001000', x_posts: '$0.005000',
//   x_post: null, x_thread: null, x_video: null, xactions_docs: null }

try {
  await x.profile('nasa');
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    error.price;    // '$0.001'
    error.amount;   // 0.001
    error.chains;   // ['Solana', 'Base']
    error.networks; // CAIP-2 ids
    error.accepts;  // the raw x402 terms to sign against
    error.resource; // 'https://xactions.app/mcp#x_profile'
  }
}
```

`prices()` reads the live list from the server, so it is never out of date with
this README. Protocol details: [x402 payments](https://xactions.app/docs/guides/x402).

### Errors

Every failure is an `XActionsError`:

```js
import { XActionsError } from 'xactions-edge';

try {
  await x.post('https://x.com/SpaceX');       // a profile URL, not a post
} catch (error) {
  error instanceof XActionsError;             // true
  error.message;   // 'post must be a post ID or an x.com status URL. Got: ...'
  error.tool;      // 'x_post'
  error.retryable; // false, so do not bother trying again
}
```

`retryable` is `true` for rate limits and transport failures, `false` for anything your input caused. Retryable failures are already retried `retries` times before you see them.

### The raw MCP surface

Useful when you are building agent tooling and want the protocol objects rather than the unwrapped data.

```js
await x.mcp.listTools();          // tool descriptors with JSON Schemas
await x.mcp.call('x_profile', { handle: 'nasa' });
await x.mcp.listPrompts();        // the server's prompt templates
await x.mcp.getPrompt('audit_account', { handle: 'nasa' });
await x.mcp.listResources();      // ~700 docs, skills and scripts, paginated for you
await x.mcp.readResource('xactions://doc/docs/video-downloader.md');
```

`x.mcp` is a complete Streamable HTTP MCP client in about 200 lines. It works against any MCP server, not just this one:

```js
import { McpClient } from 'xactions-edge';
const other = new McpClient({ endpoint: 'https://example.com/mcp' });
```

## In the browser

```html
<script type="module">
  import { createClient } from 'https://esm.sh/xactions-edge';
  const post = await createClient().post(location.hash.slice(1));
  document.body.textContent = post.text;
</script>
```

The server sends permissive CORS headers, so a page can call it directly with no proxy.

## In a Cloudflare Worker

```js
import { createClient } from 'xactions-edge';

export default {
  async fetch(request) {
    const handle = new URL(request.url).searchParams.get('handle');
    const profile = await createClient().profile(handle);
    return Response.json(profile);
  },
};
```

## Using the same server from an AI agent

You do not need this package for that. Point the agent at the URL:

```bash
claude mcp add --transport http xactions https://xactions.app/mcp
```

See [the hosted MCP guide](https://xactions.app/docs/guides/mcp-remote) for Claude Desktop, Cursor, VS Code and Windsurf.

## Rate limits and fair use

Reads are cached at the edge per post and per account, so repeated lookups of the same thing are close to free. x.com rate-limits anonymous reads on its own schedule; when it does, calls fail with `retryable: true` and recover within about a minute. Do not build a bulk crawler on a shared free endpoint. If you need volume, run your own copy: the whole thing is Apache-2.0 in [nirholas/XActions](https://github.com/nirholas/XActions), and `endpoint` points this client at it.

## Related

- [`xactions`](https://www.npmjs.com/package/xactions): the full toolkit, CLI, 154 MCP tools, browser scripts, Puppeteer scrapers
- [`xactions-mcp`](https://www.npmjs.com/package/xactions-mcp): the local MCP server, for write access with your own session

Apache-2.0, by [nichxbt](https://x.com/nichxbt).

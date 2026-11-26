# XActions MCP Server Setup Guide

> Use AI agents (Claude, Cursor, Windsurf, GPT) to automate X/Twitter — for free.

---


## x_ask: let the agent read the manual

`x_ask` answers questions about XActions itself, grounded in the documentation, the skills, the browser scripts and the repository. Use it before guessing at a workflow, inventing a script name, or telling a user something is unsupported.

```json
{ "name": "x_ask", "arguments": { "question": "how do I unfollow everyone?" } }
```

It returns the written answer, the sources behind it, and the exact runnable action (browser script, CLI command, or another MCP tool). Pass `actionsOnly: true` to skip the model entirely and get just the matching actions in milliseconds.

It is a read tool: no X session, no account access, no API key. Full guide: [Ask XActions](ask.md).

## 30-Second Quickstart

```bash
# Add to your AI client config, then restart the client
npx xactions-mcp
```

That's it. XActions will auto-install and start the MCP server.

---

## Getting Your auth_token

Most tools require an X/Twitter session cookie for authentication.

1. Go to [x.com](https://x.com) and **log in**
2. Open **DevTools** (F12 or Cmd+Option+I)
3. Go to **Application** → **Cookies** → `https://x.com`
4. Find the cookie named **`auth_token`**
5. Copy its value (a long hex string)

> ⚠️ Treat this like a password. Never share it publicly.

---

## Claude Desktop

### 1. Open config file

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add XActions

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop. You should see XActions tools listed.

### Auto-generate config

```bash
npx xactions mcp-config
```

This detects your OS and outputs the correct config snippet. Use `--write` to write it directly.

---

## Cursor

Add to your **Cursor Settings** → **MCP Servers**:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

Or add to `.cursor/mcp.json` in your project root.

---

## Windsurf

Add to your **Windsurf Settings** (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

---

## VS Code (GitHub Copilot)

Add to your **VS Code** user `settings.json` or `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "xactions": {
        "command": "npx",
        "args": ["-y", "xactions-mcp"],
        "env": {
          "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
        }
      }
    }
  }
}
```

---

## Local Install (Alternative)

If you prefer a local install instead of npx:

```bash
npm install -g xactions
```

Then use `xactions-mcp` as the command instead of `npx`:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "xactions-mcp",
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XACTIONS_SESSION_COOKIE` | For most tools | Your X/Twitter `auth_token` cookie |
| `GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` | No | AI tools use free models and work with no key; these free-tier keys add capacity. Image analysis needs `OPENROUTER_API_KEY` or `NVIDIA_API_KEY`. See [Free LLM lanes](ask.md#free-llm-lanes) |
| `XACTIONS_MODE` | No | `local` (default, free) or `remote` |
| `XACTIONS_MCP_TOOLS` | No | Allowlist of tool or group names to expose (see [Tool filtering](#tool-filtering)) |
| `XACTIONS_MCP_EXCLUDE` | No | Denylist of tool or group names to hide; wins over the allowlist |
| `XACTIONS_MCP_REQUIRE_APPROVAL` | No | `1` holds every write tool as a draft until approved (see [Approval mode](#approval-mode-draft-before-you-post)) |
| `XACTIONS_MCP_TOKEN` | No | Bearer token required on `/mcp` when running with `--http` |
| `XACTIONS_MCP_HOST` | No | Bind address for `--http` (default `127.0.0.1`) |
| `XACTIONS_HOME` | No | Directory for local state such as `mcp-drafts.json` (default `~/.xactions`) |
| `DEBUG` | No | Set to `true` for verbose error stacks |

---

## Tool filtering

The server ships 165 tools. Most sessions need a handful, and a smaller tool list means a cheaper, more accurate model. Filter with an allowlist, a denylist, or both. Each accepts a comma-separated mix of:

- **tool names** such as `x_get_profile`
- **group names** such as `read` or `analytics`
- **prefix patterns** such as `x_get_*`

Groups (run `npx xactions-mcp --list-groups` to see every member):

| Group | What it covers |
|-------|----------------|
| `read` | Profiles, followers, tweets, search, threads, media, trends, notifications, `x_list_platforms` |
| `write` | Post, reply, quote, like, retweet, bookmark, follow, unfollow, mute, delete, profile edits |
| `dm` | Send, list, and export direct messages |
| `lists` | X Lists and their members |
| `spaces` | Spaces discovery, transcripts, and the live Space agent |
| `analytics` | Account reports, growth, engagement, sentiment, bots, influencers, history |
| `ai` | Voice analysis, tweet generation, rewriting, summarising, hashtag suggestions |
| `grok` | Grok queries and image analysis |
| `automation` | Auto-like, auto-follow, smart unfollow, auto-comment, bulk execution |
| `monitoring` | Streams, keyword and account monitors, follower alerts, notifications |
| `workflows` | Saved workflows, the local scheduler, RSS to tweet drafts |
| `persona` | The persona autopilot |
| `graph` | Social graph building and analysis |
| `data` | Account export and migration, datasets, CRM, teams, format conversion |
| `auth` | `x_login` |
| `x402` | Paid plugin tools, when a plugin registers them |
| `drafts` | The four approval tools; these are never filtered out |

The rules match [xdevplatform/xmcp](https://github.com/xdevplatform/xmcp): an empty allowlist means everything, the denylist always wins, and `x_list_drafts`, `x_approve_draft`, `x_discard_draft`, `x_draft_status` stay available so pending drafts can never be orphaned. `tools/list` only returns what passes the filter, and calling a hidden tool returns an error naming the group to enable rather than a generic "unknown tool".

Environment variables (any client):

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here",
        "XACTIONS_MCP_TOOLS": "read,analytics,x_post_tweet",
        "XACTIONS_MCP_EXCLUDE": "x_get_non_followers"
      }
    }
  }
}
```

The same thing as CLI flags (Cursor, `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp", "--tools", "read,analytics", "--exclude", "x_get_*"],
      "env": { "XACTIONS_SESSION_COOKIE": "your_auth_token_here" }
    }
  }
}
```

Unknown names are reported on stderr at startup and otherwise ignored, so a typo hides nothing silently.

---

## HTTP transport

Stdio is the default and is what Claude Desktop, Cursor, Windsurf, and VS Code speak. For a remote client, a shared team server, or a container, run the [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http) transport instead:

```bash
XACTIONS_MCP_TOKEN=$(openssl rand -hex 24) npx xactions-mcp --http --port 8787 --host 127.0.0.1
```

- The MCP endpoint is `POST /mcp` (plus `GET` for the event stream and `DELETE` to end a session). Sessions are managed by the server: the `initialize` response carries an `Mcp-Session-Id` header that every later request must echo.
- `GET /health` is unauthenticated and reports tool and session counts.
- `XACTIONS_MCP_TOKEN` turns on bearer auth for everything under `/mcp`. Without it the server will still start, but only bind it to loopback (the default). Set a token before you change `--host`.
- `MCP_TRANSPORT=http` and `PORT` are honoured too, for hosts like Railway that inject them.

Hand-check it with curl:

```bash
curl -s -i -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer $XACTIONS_MCP_TOKEN" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
# copy the mcp-session-id header, then:
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer $XACTIONS_MCP_TOKEN" -H "Mcp-Session-Id: <id>" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

Claude Desktop and Cursor connect to a remote MCP server by URL. Cursor `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "xactions-remote": {
      "url": "http://127.0.0.1:8787/mcp",
      "headers": { "Authorization": "Bearer your_token_here" }
    }
  }
}
```

Tool filtering and approval mode apply to every HTTP session exactly as they do on stdio.

---

## Approval mode (draft before you post)

Giving an agent a live posting tool is a leap of faith. Approval mode, borrowed from [x-use](https://github.com/nirholas/x-use), removes it: with `XACTIONS_MCP_REQUIRE_APPROVAL=1` (or `--require-approval`) every side-effect tool is **held as a draft instead of executed**. Posting, replying, quoting, liking, retweeting, bookmarking, following, unfollowing, muting, blocking-style profile changes, DM sending, deleting, scheduling, bulk automation, workflow and persona runs, and joining Spaces are all covered; the exact register is `WRITE_TOOLS` in `src/mcp/tool-groups.js`. Read and analytics tools run immediately as before.

A held call returns the draft id:

```json
{
  "held": true,
  "draftId": "3f9c1a2b",
  "tool": "x_post_tweet",
  "args": { "text": "Shipping approval mode today." },
  "createdAt": "2026-08-27T05:15:05.512Z",
  "message": "Approval mode is on. \"x_post_tweet\" was saved as draft 3f9c1a2b and has NOT been executed.",
  "next": "Review with x_draft_status, run with x_approve_draft {\"id\":\"3f9c1a2b\"}, or drop with x_discard_draft."
}
```

Four tools manage drafts and are always available, whatever the tool filter says:

| Tool | Does |
|------|------|
| `x_list_drafts` | List drafts, newest first; optional `status` of `pending`, `executed`, `failed`, or `all` |
| `x_draft_status` | Show one draft with its arguments, state, and result or error |
| `x_approve_draft` | Execute the stored call exactly as submitted; an already-run draft is refused so nothing posts twice |
| `x_discard_draft` | Delete a draft without running it |

Drafts live in `~/.xactions/mcp-drafts.json` (`XACTIONS_HOME` overrides the directory), written atomically, so a second process, a script, or a person with a text editor can review the queue. The same list, approve, and discard functions are exported from `src/mcp/drafts.js` for use outside MCP.

Claude Desktop, read-only session that can still queue posts for you to approve elsewhere:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp", "--require-approval"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here",
        "XACTIONS_MCP_TOOLS": "read,analytics,write"
      }
    }
  }
}
```

Cursor, approval on with the drafts reviewed in the same chat:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here",
        "XACTIONS_MCP_REQUIRE_APPROVAL": "1"
      }
    }
  }
}
```

A typical exchange: the agent calls `x_post_tweet`, gets draft `3f9c1a2b` back, and shows you the text. You say "approve it", the agent calls `x_approve_draft {"id":"3f9c1a2b"}`, and only then does the tweet go out.

### Approve drafts from the terminal

You do not have to go back through the agent to release a draft. `xactions drafts` reads the same `mcp-drafts.json` the server writes:

```bash
xactions drafts list                # id, status, age, tool, argument summary
xactions drafts show 3f9c1a2b       # the full arguments
xactions drafts approve 3f9c1a2b    # runs it through the server's own dispatcher
xactions drafts approve --all       # every pending draft, oldest first
xactions drafts discard 3f9c1a2b    # drop it
```

This is the setup for a read-only agent session where a person releases posts from a shell: give the agent `XACTIONS_MCP_REQUIRE_APPROVAL=1`, and review the queue with `xactions drafts list` whenever you like. Both sides honour `XACTIONS_HOME`, so point them at the same directory if you have moved it. Full reference: [cli-reference.md](cli-reference.md#drafts-approve-mcp-write-calls-from-the-terminal).

---

## Daily action caps

X suspends accounts that follow, like or post faster than a person could. Its
limits are enforced on X's side, but by the time X says "over the limit" the
account is already flagged. XActions keeps an agent under the line on purpose:
every write tool is charged against a rolling 24 hour budget for its action
class, and a call that would go over is refused before anything reaches X.

The ledger lives in `~/.xactions/action-ledger.json` (honours `XACTIONS_HOME`),
so a budget spent this morning is still spent after a restart, a crash, or a
fresh `npx xactions-mcp`. A cap that resets when the process does is not a cap.

Nothing needs configuring: the defaults apply the moment the server starts.

`x_engage` sweeps a whole feed in one call, so it is charged once per enabled
action class for its entire `limit` before the first write, the same way
`x_bulk_execute` is charged for its whole username list. A `limit: 100` sweep
with like and reply reserves 100 of each. Keep `limit` to what you mean to
spend; a dry run (the default) is charged nothing.

| Class | Default per 24h | Tools charged to it |
|-------|-----------------|---------------------|
| `post` | 2400 | `x_post_tweet`, `x_post_thread`, `x_create_poll`, `x_schedule_post`, `x_publish_article`, `x_persona_run`, `x_workflow_run` |
| `reply` | 2400 | `x_reply`, `x_quote_tweet`, `x_auto_comment`, `x_engage` |
| `like` | 500 | `x_like`, `x_auto_like`, `x_bookmark`, `x_engage` |
| `repost` | 500 | `x_retweet`, `x_auto_retweet`, `x_engage` |
| `follow` | 400 | `x_follow`, `x_auto_follow`, `x_follow_engagers` |
| `unfollow` | 400 | `x_unfollow`, `x_unfollow_non_followers`, `x_unfollow_all`, `x_smart_unfollow` |
| `dm` | 500 | `x_send_dm` |
| `block` | 500 | `x_block_user` |
| `mute` | 500 | `x_mute_user`, `x_unmute_user` |
| `delete` | 2400 | `x_delete_tweet`, `x_clear_bookmarks` |

The published sources are X's own limits page (2,400 posts and 500 direct
messages a day, 400 follows a day). Classes X does not publish a number for
reuse the closest published figure, deliberately on the low side.

Ask for the remaining budget at any time with the `x_action_budget` tool, which
is always available and never charged:

```json
{
  "account": "nichxbt",
  "windowHours": 24,
  "classes": {
    "follow": { "cap": 400, "used": 37, "remaining": 363, "resetAt": "2026-08-28T09:14:02.113Z" }
  }
}
```

A refused call answers with the class, the cap, and when the next slot frees, so
an agent can wait rather than retry into a suspension:

```json
{
  "error": "Daily cap reached for \"follow\" on account \"nichxbt\": 400/400 in the last 24h.",
  "code": "ACTION_CAP_EXCEEDED",
  "resetAt": "2026-08-28T09:14:02.113Z"
}
```

### Changing the caps

Set `XACTIONS_ACTION_CAPS` to a JSON object, or write the same shape to
`~/.xactions/action-caps.json`. A flat map sets every account; an `accounts` key
sets one. `0` disables a class entirely.

```bash
XACTIONS_ACTION_CAPS='{"follow":150,"like":300,"accounts":{"brand":{"post":50}}}'
```

Which account a call is charged to is, in order: the server's `account` option,
`XACTIONS_ACCOUNT`, the username of the saved session, then `default`. Approving
a held draft is charged the same as running the tool directly, so the approval
gate cannot be used to spend past a cap.

---

## Available Tools

### Scraping (free, no API key needed)

| Tool | Description |
|------|-------------|
| `x_get_profile` | Get any user's profile (bio, followers, etc.) |
| `x_get_followers` | Scrape a user's followers list |
| `x_get_following` | Scrape who a user follows |
| `x_get_tweets` | Scrape a user's recent tweets |
| `x_search_tweets` | Search tweets by keyword |
| `x_get_thread` | Unroll and read an entire thread |
| `x_download_video` | Extract video download URL from a tweet |

### Analysis

| Tool | Description |
|------|-------------|
| `x_detect_unfollowers` | Snapshot followers to detect unfollowers over time |
| `x_analyze_sentiment` | Sentiment analysis (rule-based or LLM) |
| `x_best_time_to_post` | Find optimal posting times from tweet history |
| `x_competitor_analysis` | Compare metrics across accounts |
| `x_brand_monitor` | Monitor brand mentions with sentiment |

### Actions (require auth_token)

| Tool | Description |
|------|-------------|
| `x_follow` | Follow a user |
| `x_unfollow` | Unfollow a user |
| `x_like` | Like a tweet |
| `x_post_tweet` | Post a tweet |
| `x_post_thread` | Post a multi-tweet thread |
| `x_reply` | Reply to a tweet |
| `x_retweet` | Retweet a tweet |
| `x_bookmark` | Bookmark a tweet |
| `x_send_dm` | Send a direct message |

### AI Tools (free models, no key needed)

| Tool | Description |
|------|-------------|
| `x_analyze_voice` | Analyze a user's writing style |
| `x_generate_tweet` | Generate tweets in a user's voice |
| `x_summarize_thread` | AI-powered thread summarization |

---

## Example Prompts

Try these with Claude, Cursor, or any MCP-compatible AI:

### Research
> "Get the profile and last 20 tweets from @elonmusk. Summarize the main topics."

### Growth
> "Find everyone I follow who doesn't follow me back. Show me the list sorted by how long ago I followed them."

### Content
> "Analyze @paulg's writing style, then generate 3 tweet ideas about startups in his voice."

### Analytics
> "Compare the follower counts, tweet frequency, and engagement of @openai, @anthropic, and @google."

### Engagement
> "Search for tweets about 'AI agents' from the last day. Like the top 5 most engaging ones."

---

## Troubleshooting

### `npx xactions-mcp` returns 404 / package not found

Make sure you have the latest version. If the `xactions-mcp` package hasn't been published yet, use either of these alternatives:

```bash
# Option 1: Use the -p flag to install from the xactions package
npx -p xactions xactions-mcp

# Option 2: Install globally first
npm install -g xactions
xactions-mcp
```

For MCP client configs, the `-p` flag approach:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "-p", "xactions", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

### "Tool not found" or no tools showing

1. Make sure the MCP server is configured correctly in your client
2. Restart your AI client after changing config
3. Check that Node.js 18+ is installed: `node --version`

### "Could not follow/unfollow/post"

Auth is required for action tools. Make sure `XACTIONS_SESSION_COOKIE` is set in your MCP config `env`.

### "every LLM lane failed"

AI tools run on free models. Their keyless lanes are rate limited per IP, so at busy times all of them can be. Add a free-tier key (`GROQ_API_KEY` is quickest; `NVIDIA_API_KEY` and `OPENROUTER_API_KEY` also work) to get a lane of your own. Image analysis has no keyless lane and needs `OPENROUTER_API_KEY` or `NVIDIA_API_KEY`.

### Server won't start

```bash
# Test manually
node node_modules/xactions/src/mcp/server.js

# Or if globally installed
xactions-mcp
```

### Browser automation errors

XActions uses Puppeteer for browser automation. If you see Chrome/Chromium errors:

```bash
# Install Chromium dependencies (Linux)
npx puppeteer browsers install chrome
```

---

## Two ways in, and when not to use this server

A 150-tool server is a lot to hand a client that only needs to read one
profile. Every tool ships its JSON schema on connect, so the `tools/list`
payload is about 60 KB before any work happens. That is a fair price for a
long session or for writes, and a poor one for a single lookup.

XActions offers both lanes from the same install, which is unusual: the CLI
runs the same code as the MCP tools, so nothing is lost by choosing it.

```bash
xactions profile NASA --compact
xactions tweets NASA --limit 50 --fields id,date,likes,text --compact
xactions analyze NASA SpaceX --compact
```

`--compact` prints one record per line as tab-separated `key=value` pairs, and
`--fields` narrows the columns. One Bash call, no schemas loaded, and `jq` or
`wc` can finish the job before the answer ever reaches the model.

Use this MCP server when you are writing (posting, following, muting) and want
the [approval mode](#approval-mode-draft-before-you-post) gate, or when a
session will make enough calls that the schema cost amortises. Use the CLI when
you need a few facts and you are done. If you do load the server for a
read-only session, narrow it first with
[tool filtering](#tool-filtering): `XACTIONS_MCP_TOOLS=read`.

The full decision table, with the recipes and the exact flags, is in
[AGENTS.md](../AGENTS.md), which coding agents read automatically.

### One-click install: the .mcpb bundle

Instead of editing a JSON config by hand, download `xactions-<version>.mcpb`
from the [releases page](https://github.com/nirholas/XActions/releases) and
drag it onto **Claude Desktop > Settings > Extensions**.

The bundle carries the server and its production dependencies, so there is no
npm install and no absolute path to type. Its manifest declares the settings it
needs, and Claude Desktop collects them at install time:

| Field | What it sets |
|---|---|
| X session cookie (auth_token) | `XACTIONS_SESSION_COOKIE`, stored by the host as a secret. Leave it empty to run the guest tier |
| Tool groups to expose | `XACTIONS_MCP_TOOLS`, for example `read,analytics` |
| Tool groups to hide | `XACTIONS_MCP_EXCLUDE`, for example `write,dm` |
| Hold writes for approval | `XACTIONS_MCP_REQUIRE_APPROVAL` |

Browser-driven tools download Chromium into your own puppeteer cache the first
time they run; every HTTP tool works without it.

To build the bundle from a clone:

```bash
node scripts/build-mcpb.mjs                 # dist/xactions-<version>.mcpb
node scripts/build-mcpb.mjs --manifest-only # write and validate the manifest only
```

The build stages the payload, installs production dependencies inside the
bundle, validates the manifest against the MCPB schema, packs it, then unpacks
the result and starts the server from it, so a bundle that cannot launch fails
at build time rather than on someone's desktop.

---

## Links

- **GitHub**: [github.com/nirholas/XActions](https://github.com/nirholas/XActions)
- **npm**: [npmjs.com/package/xactions](https://www.npmjs.com/package/xactions)
- **Dashboard**: [xactions.app](https://xactions.app)
- **Issues**: [github.com/nirholas/XActions/issues](https://github.com/nirholas/XActions/issues)

---

*Built by [@nichxbt](https://x.com/nichxbt). Apache 2.0 License.*

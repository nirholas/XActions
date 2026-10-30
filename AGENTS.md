# XActions for agents

X/Twitter automation with no X API key: a 56-command CLI, a Node library, 152
MCP tools, 50 agent skills, 95 browser console scripts, and a web dashboard.
Apache-2.0, by nichxbt.

This file is for the agent, not the human. It answers one question first,
because getting it wrong costs the whole session: **do you shell out to the
CLI, or do you load the MCP server?**

---

## Two lanes into the same engine

XActions ships both lanes from one install, and they call the same code. The
difference is what each costs you before you have read a single tweet.

| | CLI lane | MCP lane |
|---|---|---|
| How you call it | one Bash call, `xactions <cmd> --compact` | a tool call, after the client connects the server |
| What loads into context up front | nothing | the whole tool list |
| What comes back | the rows you asked for, one per line | a JSON result object |
| Writes | reads, plus `engage` and `bulk` | every write tool, with an approval gate |
| Usable without client configuration | yes, it is just a process | no, the client must be configured first |

The tool list is not small. The server advertises 152 tools, and the
`tools/list` payload it serves is about 60 KB of JSON before you have done any
work at all. Measure it yourself:

```bash
node -e "import('./src/mcp/server.js').then(m => console.log(JSON.stringify(m.TOOLS).length, 'bytes,', m.TOOLS.length, 'tools'))"
```

That cost is worth paying when you are going to make many calls in a session,
keep state between them, or write. It is not worth paying to answer "how many
followers does this account have."

### The rule

**Reading a handful of things? Shell out. Working a long session, or writing?
Load the server.**

Concretely, prefer the CLI when:

- You need one or two facts and then you are done.
- You are inside a larger task where X is a detail, not the subject.
- You want to pipe, filter, or count the result with `jq`, `grep`, `sort`,
  `wc`, or feed it to another command in the same Bash call.
- The client has no MCP configuration and you are not going to add one.

Prefer the MCP server when:

- You are posting, replying, following, muting, or deleting, and you want the
  draft-approval gate to hold each write for a human.
- The session will make many calls and the per-call schema cost amortises.
- You want the structured error objects and the session state the server keeps
  across calls.

Nothing stops you from using both. `xactions mcp-config` writes the client
config, and the CLI keeps working next to it.

---

## The CLI lane

### The output contract

Two flags, and they are global, so every read command takes them:

- `--compact` prints one record per line as tab-separated `key=value` pairs,
  essential fields only, no colours and no spinners.
- `--fields <list>` narrows that to exactly the columns you name, in the order
  you name them.

`--json` is per command and prints the full structured object.

**`--compact` wins when both are passed.** They are alternatives, not a pair:
pick `--compact` when you are going to read the answer yourself, and `--json`
when you are going to pipe it into `jq`.

Field names are shared across commands, so `--fields likes` means the same
thing everywhere. The defaults per record kind:

| Record kind | Default columns |
|---|---|
| tweet | `id username date likes retweets replies views text` |
| profile | `id username name followers following tweets verified bio` |
| user | `id username name followers verified bio` |
| media | `type url tweetUrl` |
| report | `username followers following postsPerDay engagementRate medianEngagement mediaShare bestHourUTC bestWeekday` |

Anything else the record carried can still be named in `--fields`.

### Recipes

Read a profile:

```bash
xactions profile NASA --compact
xactions profile NASA --fields username,followers,verified --compact
```

Read someone's posts:

```bash
xactions tweets NASA --limit 50 --compact
xactions tweets NASA --limit 200 --fields id,date,likes,text --compact
xactions tweets NASA --limit 50 --json | jq '[.[] | select(.likes > 1000)] | length'
```

Search:

```bash
xactions search "agent skills" --limit 40 --compact
xactions search "mcp server" --filter top --limit 25 --fields username,likes,text --compact
```

`--filter` takes `latest` (the default), `top`, `people`, `photos`, `videos`.

Followers, and who does not follow back:

```bash
xactions followers nichxbt --limit 500 --compact
xactions following nichxbt --limit 500 --fields username,followers --compact
xactions non-followers nichxbt --limit 500 --compact
```

Account report, and comparisons:

```bash
xactions analyze NASA --compact
xactions analyze NASA SpaceX --fields username,followers,engagementRate,bestHourUTC --compact
```

`analyze` takes several usernames and samples `--limit` posts from each
(default 50, clamped to the 5 to 200 range).

The rest of the read surface, same flags:

```bash
xactions hashtag ai --limit 50 --compact
xactions thread https://x.com/NASA/status/1234567890 --compact
xactions media NASA --limit 30 --compact
```

### One Bash call, whole answer

The point of the lane is that the shell does the second half of the work, so
nothing intermediate has to pass through the context window:

```bash
# Top five posts by likes, text only
xactions tweets NASA --limit 200 --json | jq -r 'sort_by(-.likes) | .[:5] | .[] | "\(.likes)\t\(.text)"'

# How many of the accounts I follow do not follow back
xactions non-followers nichxbt --limit 1000 --compact | wc -l

# Accounts above 100k followers, from a follower list
xactions followers nichxbt --limit 1000 --json | jq -r '.[] | select(.followers > 100000) | .username'
```

### What needs a login

Public reads work with no account: `profile`, `tweets`, `thread`, `media`,
`analyze`, `hashtag`. Search, `followers`, `following`, `non-followers`, likes,
bookmarks and DMs need a session.

```bash
xactions doctor    # what works right now, and what each failure needs
xactions connect   # log in through a real browser and save the session
xactions login     # or paste an auth_token cookie
```

If the machine already has a logged-in browser, do not make the user copy a
cookie out of DevTools:

```bash
xactions login --from-browser chrome        # or chromium, brave, edge, arc, firefox
xactions login --cookies-file cookies.txt   # Netscape cookies.txt
xactions login --cookies-file cookies.json  # Cookie-Editor / EditThisCookie export
xactions login --cookies-file state.json    # Playwright / Puppeteer storageState
```

`--cookies-file` also takes a raw `auth_token=...; ct0=...` string in a file.
Prefer a full cookie jar over a bare `auth_token`: it carries `ct0`, which
every write needs.

### Long jobs, and the accounts that survive them

One X session is worth roughly 50 GraphQL calls per operation per 15 minutes,
so a follower scrape of any real size needs more than one:

- **Account pool.** Sessions live in a SQLite database with their cookies,
  optional proxy, lock state and a per-operation rate-limit window read from
  X's own `x-rate-limit-*` response headers. The pooled client looks like a
  single client and rotates on its own: a 429 or a spent window moves the call
  to the next account, a 401 or 403 locks the account.
  `src/scrapers/twitter/http/accountPool.js`.
- **Resumable scrapes.** A checkpoint JSON file is written after every page. A
  `--limit 50000` scrape that dies at page 400 restarts from the saved cursor
  with the collected count already subtracted, so re-running the same command
  finishes the job. `src/scrapers/twitter/http/checkpoint.js`.

Neither needs configuring for a small read. Reach for them when a job is large
enough that a rate-limit wall is a matter of when, not if.

`xactions doctor` is the first command to run when something returns nothing:
it reports the guest tier, the saved session, the query-ID cache and the
installed skills, with the fix next to each failure.

---

## The MCP lane

```bash
xactions mcp-config                     # print the config for Claude Desktop
xactions mcp-config --client cursor     # or cursor, windsurf, vscode
xactions mcp-config --write             # write it into Claude Desktop's config file
node src/mcp/server.js                  # run it directly over stdio
node src/mcp/server.js --http --port 3000   # Streamable HTTP on /mcp instead
```

stdio is the default and is what a local client wants. `--http` (or
`MCP_TRANSPORT=http`) serves the Streamable HTTP transport on `/mcp` for a
remote or hosted client; set `XACTIONS_MCP_TOKEN` and send
`Authorization: Bearer <token>` to require auth on it.

### Do not load all 152 tools

The tool list is filterable by group, and a filtered tool is neither advertised
nor callable, so the schema cost drops with it. Groups: `read`, `write`, `dm`,
`lists`, `spaces`, `analytics`, `ai`, `grok`, `automation`, `monitoring`,
`workflows`, `persona`, `graph`, `data`, `x402`, `drafts`, `auth`.

```bash
XACTIONS_MCP_TOOLS=read,analytics node src/mcp/server.js
XACTIONS_MCP_EXCLUDE=write,dm node src/mcp/server.js
node src/mcp/server.js --tools read,analytics
node src/mcp/server.js --exclude write,dm
```

If a session is only ever going to read, `XACTIONS_MCP_TOOLS=read` is the
closest the MCP lane gets to the CLI lane's context cost.

### Hold writes for a human

```bash
XACTIONS_MCP_REQUIRE_APPROVAL=1 node src/mcp/server.js
```

Every tool that posts, deletes, follows, mutes or sends is then saved as a
draft instead of running. Release or bin them with the `x_list_drafts`,
`x_approve_draft` and `x_discard_draft` tools, or from the shell:

```bash
xactions drafts list
xactions drafts show <id>
xactions drafts approve <id>
xactions drafts discard <id>
```

### Daily action caps

Separate from approval, and always on. Every write tool call is charged
against a rolling 24 hour per-account budget for its action class, and a call
that would go over is refused before anything reaches X. The ledger is a JSON
file under `XACTIONS_HOME` (default `~/.xactions`), so the budget survives a
restart, a crash, and a fresh `npx xactions-mcp`. Defaults follow X's own
published limits. `src/mcp/action-caps.js`.

### Environment

| Variable | Effect |
|---|---|
| `XACTIONS_SESSION_COOKIE` | The `auth_token` cookie. Without it the server runs the guest tier |
| `XACTIONS_MODE` | `local` (default, free, Puppeteer) or `remote` |
| `XACTIONS_MCP_TOOLS` | Allowlist of tool names or groups |
| `XACTIONS_MCP_EXCLUDE` | Denylist, applied after the allowlist |
| `XACTIONS_MCP_REQUIRE_APPROVAL` | Hold every write tool as a draft |
| `XACTIONS_MCP_TOKEN` | Bearer token required by the `--http` transport |
| `XACTIONS_HOME` | Where sessions, checkpoints, the action ledger and the query-ID cache live (default `~/.xactions`) |
| `XACTIONS_WEBHOOK_SECRET` | Signing key for outbound webhook deliveries |

### Installing without a config file

`.mcpb` is a bundle the user drags onto Claude Desktop > Settings > Extensions.
It carries the server and its dependencies, and its manifest prompts for the
session cookie and the tool groups at install time, so nothing is typed into a
config file. Built with `node scripts/build-mcpb.mjs`, attached to each release
by `.github/workflows/release-mcpb.yml`.

---

## Straight to the file

The requests that come up most, and what answers them. Every path is real; if one
is not, that is a bug in this table.

| Request | Answer |
|---|---|
| Unfollow everyone | `src/unfollowEveryone.js` |
| Unfollow people who do not follow back | `src/unfollowback.js`, or `xactions non-followers` |
| Who unfollowed me | `src/detectUnfollowers.js` |
| Download a video | `scripts/videoDownloader.js` |
| Like, repost and reply to every post on a profile | `scripts/engageProfile.js` (browser panel) or `xactions engage <user> --like --repost --comment --prompt "..."`. See [`docs/engage.md`](docs/engage.md) |
| Act on every result of a search | `scripts/searchSweep.js`. See [`docs/search-sweep.md`](docs/search-sweep.md) |
| Train the algorithm for a niche | `src/automation/algorithmBuilder.js`, or `xactions persona create` |
| Grow an account over time | [`skills/algorithm-cultivation/SKILL.md`](skills/algorithm-cultivation/SKILL.md) |
| Run a long-lived LLM-driven agent | `src/algorithmBuilder.js` with `src/personaEngine.js`, via `xactions persona run <id>` |
| Read an account without logging in | `xactions profile <user>`, `xactions tweets <user>` |
| Import an official X archive | `xactions archive <path-to-zip>` |
| Hold agent writes for human approval | set `XACTIONS_MCP_REQUIRE_APPROVAL=1`, then `xactions drafts` |
| Log in from a browser already signed in to x.com | `xactions login --from-browser`, or `--cookies-file` for an export |
| Watch an account in real time | `xactions stream start tweet <user>`, or `src/streaming/livePipeline.js` for x.com's own event pipeline |
| Send an event to another service | `src/notifications/webhook.js`, signed with `XACTIONS_WEBHOOK_SECRET` |
| Keep a big scrape alive across rate limits | `src/scrapers/twitter/http/accountPool.js` and `checkpoint.js` |

---

## Skills

50 skills live in [`skills/`](skills/), one directory each, following the
[Agent Skills specification](https://agentskills.io/specification): a
`SKILL.md` with `name` and `description` frontmatter, plus `references/` where
a skill needs more than one file. Read the one that matches the request before
you start; each names the exact script, page and arguments for its job, and the
mistakes to avoid.

```bash
xactions skills list                    # every skill, and where each is installed
xactions skills show follower-monitoring
xactions skills install --all --global  # ~/.claude/skills/<id>/
xactions skills install --all --target cursor
```

Any third-party installer that follows the spec resolves the same tree:

```bash
npx skills add nirholas/XActions
```

The catalogue and what each skill covers: [`docs/skills.md`](docs/skills.md).
The machine-readable index: [`skills/index.json`](skills/index.json).

---

## Where things live

```
src/cli/          The xactions command. index.js registers most commands,
                  commands/ holds the ones with their own modules
src/mcp/          MCP server, tool groups, draft-approval gate
src/scrapers/     HTTP and browser scrapers
src/client/       The low-level HTTP Twitter client
src/automation/   Browser console scripts (paste core.js first)
src/a2a/          Agent-to-Agent protocol server
skills/           50 Agent Skills, one directory each
api/              Express backend (routes/, services/, middleware/)
dashboard/        Static frontend
scripts/          The 95 browser console scripts, plus build and maintenance
                  scripts (twitter/ holds standalone console variants)
docs/             Documentation
extension/        Browser extension
prisma/           Database schema
```

The three runtime contexts, because code that is correct in one is broken in another:

| Context | Runs in | Entry point | Hard constraint |
|---|---|---|---|
| Browser scripts | the DevTools console on x.com | an IIFE you paste | no Node APIs; DOM and `sessionStorage` only |
| Library, CLI, MCP | your machine | `src/cli/index.js`, `src/mcp/server.js` | Node >= 22.19, ESM throughout |
| API server | an Express process | `api/server.js` | PostgreSQL via Prisma, Redis for the queue |

Stack: Node >= 22.19 ESM (CI runs 22 and 24), Express with Helmet and rate limiting, Prisma, Bull on Redis,
Puppeteer with the stealth plugin, Vitest, `@modelcontextprotocol/sdk`, Socket.io.

Deeper map: [`docs/`](docs/), starting with
[`docs/mcp-setup.md`](docs/mcp-setup.md) and [`docs/skills.md`](docs/skills.md).

---

## Things that will bite you

- **Browser scripts run in the DevTools console on x.com**, not in Node. Paste
  `src/automation/core.js` first; it provides the config, selectors, utilities
  and rate limiting the others assume.
- **X's DOM changes often.** Prefer `data-testid` selectors. Current ones:
  [`docs/agents/selectors.md`](docs/agents/selectors.md).
- **Rate limits are real.** Every automation path keeps delays between actions.
  Do not remove them to go faster; the account pays for it.
- **An empty result is an error, not a zero.** The read commands throw rather
  than reporting "0 results", because a silent zero is indistinguishable from
  an account that genuinely has nothing.
- **GraphQL query IDs are refreshed from x.com's own bundles**, not pinned. If
  every read breaks at once, `xactions doctor` reports the cache age.
- **Requests are signed.** Every GraphQL call carries an
  `x-client-transaction-id` header computed the way x.com's own client computes
  it (`src/scrapers/twitter/http/transactionId.js`). A hand-rolled request that
  omits it gets a different, worse answer from X than the client does.
- **The live pipeline is not a WebSocket.** x.com answers an `Upgrade` request
  with the same HTTP/2 response it gives a plain GET, never a 101. It is a
  streaming GET whose body is newline-delimited JSON read line by line. Do not
  "fix" it into a WebSocket client.

## House style

- ES modules, `const` over `let`, async/await.
- Errors handled at the boundaries: network, user input, and the CLI surface.
- No mocks, no stubs, no placeholder data anywhere in committed work.
- Every file carries `@author nich (@nichxbt)` and the Apache-2.0 notice.
- Third-party code is attributed in
  [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) before it is merged. Read
  the licence table there before adapting anything from another project.
- People are credited where readers see it. When a fix comes from someone's
  issue or PR, add them to [`CONTRIBUTORS.md`](CONTRIBUTORS.md) in the same
  change, name them in the CHANGELOG entry, and add a `Reported-by:` (or
  `Co-authored-by:` for their code) trailer to the commit. The rules are in
  [CONTRIBUTING.md](CONTRIBUTING.md#credit).

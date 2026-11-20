# Engagement sweeps: like, repost, and reply across a whole feed

> Sweep a profile, a search, a list, a hashtag, or your timeline in one go, from the browser console, the terminal, or an AI agent, with replies written by you or by an LLM from a one-line brief.

Doing this by hand on a profile with a hundred posts takes twenty minutes of
clicking. A sweep does the same thing while you make coffee, at a pace X does
not mind, and it remembers what it already did so you can stop and pick up
later.

Three surfaces, one behaviour:

| Surface | Entry point | Best when |
|---------|-------------|-----------|
| Browser console | [`scripts/engageProfile.js`](../scripts/engageProfile.js) | You are already logged into x.com in a tab. Nothing to install. A floating panel drives it. |
| CLI | `xactions engage` ([`src/cli/commands/engage.js`](../src/cli/commands/engage.js)) | You want any LLM provider, a cron, JSON output, or no browser at all. |
| MCP tool | `x_engage` ([`src/mcp/server.js`](../src/mcp/server.js)) | An agent in Claude, Cursor, or Windsurf should run the sweep for you. |

The CLI and the MCP tool run the identical engine ([`src/engage/`](../src/engage/))
and share the same progress files, so a sweep an agent starts and one you start
by hand never double-engage the same post.

---

## Which feeds can be swept

| Feed | Browser | CLI / MCP |
|------|---------|-----------|
| A profile | `x.com/USERNAME` | `xactions engage USERNAME` |
| A profile including its replies | `x.com/USERNAME/with_replies` | `--replies` |
| Search results | `x.com/search?q=...` | `--search "query"` |
| A list | `x.com/i/lists/ID` | `--list ID` |
| A hashtag | `x.com/hashtag/TAG` | `--search "#TAG"` |
| Your home timeline | `x.com/home` | (browser only) |

On a profile, "everything by this account" is a sensible default. On a feed
that mixes authors, it is not: **set the filters before you turn dry run off.**
Both surfaces make reposts eligible automatically on a mixed feed, because
otherwise the repost filter would reject the whole page.

---

## Browser console

1. Open the feed you want to sweep.
2. Open DevTools (<kbd>F12</kbd>), Console tab.
3. Paste [`scripts/engageProfile.js`](../scripts/engageProfile.js). A panel appears bottom-right.
4. Tick the actions you want, set the filters, leave **Dry run** on, click **▶ Start**.
5. Read the log. When it looks right, untick **Dry run** and start again.

<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> starts and stops,
<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> pauses.

### `XEngage.inspect()`: why is it skipping everything?

The most common confusion with a filtered sweep is a run that engages nothing
and does not say why. Run this in the console at any time:

```js
XEngage.inspect()
```

It reads the posts currently on screen (changing nothing) and returns one row
per post: id, author, text, like count, whether you already liked or reposted
it, what an earlier run did to it, and either `eligible: true` or the exact
filter that rejected it.

```
[
  { id: '184…', author: 'nasa',    likes: 1234, eligible: true,  why: null },
  { id: '184…', author: 'spammer', likes: 900,  eligible: false, why: '@spammer is on the skip list' },
  { id: '184…', author: 'esa',     likes: 5,    eligible: false, why: 'only 5 likes' },
]
```

The rest of the console API: `XEngage.start()`, `.pause()`, `.stop()`,
`.undo()`, `.reset()`, `.export()`, `.testAi()`, plus `.config` and `.state`.

### Filters

Aimed at mixed feeds, and all optional on a profile.

| Filter | What it does |
|--------|--------------|
| Only from | Engage only these handles. |
| Never these handles | Skip these authors entirely. |
| Must contain | Post must contain one of these words. |
| Must not contain | Skip posts containing any of these words (`giveaway`, `airdrop`, …). |
| Min likes / Max likes | A like floor and ceiling. A low ceiling targets smaller accounts, who actually notice. |
| Skip verified accounts | Skip blue checks. |

Your own posts are never engaged: the script reads your handle from the
sidebar. It says so in the log if it cannot find it.

### Pacing

| Preset | Between posts | Between actions on one post |
|--------|---------------|-----------------------------|
| Stealth | 45 to 90 s | 2.5 to 5 s |
| Safe (default) | 15 to 35 s | 1.8 to 3.5 s |
| Moderate | 7 to 15 s | 1.2 to 2.5 s |
| Fast | 3 to 7 s | 0.9 to 1.8 s |

On top of the preset it rests for 90 seconds every 20 posts, and after three
failed actions in a row it backs off for five minutes. Every action is verified
against the DOM (the like button must turn into an unlike button, the composer
must close) and any toast that reads like a throttle stops the run early rather
than burning through the limit. Expect a 100-post sweep on Safe to take 40 to
60 minutes. That is the point: the twenty-minute manual version is exactly the
pattern X flags.

### Replies: templates

One template per line in the panel. `{author}` becomes `@handle`, `{name}` the
display name. The same template is never used twice in a row.

### Replies: AI

Switch **Source** to AI and write the brief, for example:

> Reply as a thoughtful builder who genuinely follows this account. Be specific to the post, add one idea or one honest question, keep it under two sentences, no hype words.

The model gets your brief, the post text, the quoted post if any, a note when
there is media it cannot see, and your last five replies so it varies its
phrasing. The reply is sanitised (no fences, quotes, labels, or hashtags) and
regenerated once if it opens with boilerplate like "Great post". **Test on the
first post** shows what it would write without posting anything.

Which provider you can use from the console is decided by x.com, not by us:

- **xAI (Grok)** works straight from the console. x.com's Content-Security-Policy
  allows `connect-src https://*.x.ai`, so `fetch` to `api.x.ai` goes through.
  Get a key at [console.x.ai](https://console.x.ai). Default model `grok-3-mini`.
- **OpenRouter, OpenAI, Anthropic, Ollama, anything else** are blocked from the
  page by that same CSP. Two ways around it:
  1. Install the [XActions browser extension](../extension/) and pick
     **XActions extension (any provider)** in the panel. The page hands the
     request to the extension's service worker, which is not bound by the
     page's CSP, and gets the text back.
  2. Use the CLI below, which has no CSP at all.

"Remember key in this browser" stores the key in `localStorage` on x.com.
Leave it unticked on a shared machine.

### Undo and export

**↩** unlikes and un-reposts everything from the current session. Replies are
left in place, since deleting posts is a different kind of action; the export
lists every reply with its URL so you can find them. **⬇ Export log** downloads
a JSON record of the run: config (key redacted), counts, and per-post results.

---

## CLI

```bash
xactions connect                     # once: log in through a real browser
xactions engage nasa --like --repost --dry-run
xactions engage nasa --like --repost --comment --prompt "supportive, specific, one honest question, no hype"
xactions engage --search "open source AI" --like --comment --prompt "curious builder" --max-likes 50
xactions engage --list 1234567890 --like --keyword solana,rust --limit 25
```

Runs on the HTTP client: no Chromium, no DOM. Any provider works because there
is no page CSP in the way.

### Options

| Flag | What it does |
|------|--------------|
| `--search <query>` / `--list <id>` | Sweep a search or a list instead of a profile. |
| `--mode <Latest\|Top>` | Search ranking. |
| `--like` / `--repost` / `--comment` | Which actions to take. At least one is required. |
| `-l, --limit <n>` | Posts to engage this run (default 100). Reads further back than this to fill the quota after filtering. |
| `--replies` / `--reposts` | Include replies / include reposts of other accounts. |
| `--since <date>` | Only posts on or after this date. |
| `--from <handles>` / `--skip-user <handles>` | Author allow and block lists (comma-separated, repeatable). |
| `--keyword <words>` / `--skip-keyword <words>` | Text must contain / must not contain. |
| `--min-likes <n>` / `--max-likes <n>` | Like floor and ceiling (0 = no ceiling). |
| `--template <text>` | A reply template, repeatable. `{author}` and `{name}` are filled in. |
| `--templates-file <path>` | One template per line; `#` lines are comments. |
| `--prompt <brief>` | Turns on AI replies. The brief is the whole instruction. |
| `--persona <text>` | Optional first line of the system prompt. |
| `--provider <name>` | `free` (default): XActions' free models, no key needed. Or bring your own key: `openrouter`, `openai`, `xai`, `anthropic`, `ollama`, `custom`. |
| `--model <name>` | For a non-free provider. Default if omitted: `openrouter/free`, `gpt-4o-mini`, `grok-3-mini`, `claude-haiku-5-5`, `llama3.1`. |
| `--api-key <key>` | Your own key for a non-free provider, or set `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`. `free` and Ollama need none. |
| `--base-url <url>` | For `--provider custom`: a full OpenAI-compatible chat-completions URL. |
| `--delay <s>` / `--jitter <s>` | Seconds between posts (default 20 ± 10). |
| `--dry-run` | Print everything, including the generated replies, post nothing. |
| `--reset` / `--no-resume` | Forget saved progress / neither read nor write it. |
| `--json` | Machine-readable report on stdout, nothing else. |

When both `--prompt` and templates are given, the model is used and a template
is the fallback if it fails. Rate limits from X pause the run for the time X
asks (five minutes when it does not say), then continue.

A run that engages nothing prints the reason for every skipped post, counted:

```
Nothing left to do. Why every post was skipped:
    31  already done
     9  reply
     2  no keyword match
```

Progress is saved to `~/.xactions/engage/<feed>.json`, one file per feed, so a
profile sweep and a search sweep keep separate records.

### As a cron

```bash
# Every morning: like and reply to whatever @nasa posted since yesterday
0 9 * * * GROQ_API_KEY=gsk_... xactions engage nasa --like --comment \
  --prompt "curious, specific, one question" --since "$(date -d yesterday +%F)" --json >> ~/engage.log
```

---

## MCP tool: `x_engage`

Point Claude, Cursor, or Windsurf at the [MCP server](mcp-setup.md) and ask in
plain language: *"sweep @nasa's last 10 posts, like and reply, replies should
be curious and specific, dry run first."*

```json
{
  "name": "x_engage",
  "arguments": {
    "username": "nasa",
    "like": true,
    "comment": true,
    "limit": 10,
    "prompt": "curious builder, specific to the post, one honest question",
    "dryRun": true
  }
}
```

Notes that matter:

- **`dryRun` defaults to `true`.** An agent that calls this tool without
  thinking about it previews rather than posts. Pass `dryRun: false` to act.
- **It is a write tool.** With `XACTIONS_MCP_REQUIRE_APPROVAL=1` a live sweep
  becomes a draft you approve with `x_approve_draft`, like any other write.
- **It is charged against the daily action caps** ([action-caps](mcp-setup.md)),
  once per enabled action class for the whole `limit`, before the sweep starts.
  A `limit: 100` sweep with like + reply reserves 100 likes and 100 replies, so
  keep `limit` to what you actually intend to spend.
- Use `username`, `search`, or `list`; exactly one. The filters
  (`onlyFrom`, `skipUsers`, `keywords`, `skipKeywords`, `minLikes`, `maxLikes`)
  match the CLI flags.

---

## Node API

```js
import { Scraper } from 'xactions/client';
import { resolveSource, collectTweets, runEngage } from 'xactions/engage';
import { createCommentGenerator } from 'xactions/ai';

const scraper = new Scraper();
await scraper.loadCookies('/home/you/.xactions/cookies.json');

const source = resolveSource({ search: 'open source AI' });
const filters = { actions: { like: true, repost: false, comment: true }, maxLikes: 50 };
const { selected, skipped } = await collectTweets(scraper, source, filters, 10);

const report = await runEngage({
  scraper,
  source,
  tweets: selected,
  actions: filters.actions,
  generator: createCommentGenerator({ prompt: 'curious engineer, one question' }),
  dryRun: true,
  onEvent: (event) => console.log(event.type, event.action ?? ''),
});

console.log(report.processed, report.commented, skipped.length);
```

The comment generator is also exposed over HTTP for tools that are not Node:

```http
POST /api/ai/writer/comment
{ "tweet": { "text": "We cut p99 from 900ms to 40ms", "author": "nasa" },
  "prompt": "engineer who is curious about the how, one question, no hype" }
```

---

## Staying out of trouble

- **Dry run first, every time.** All three surfaces default to it.
- **On a mixed feed, filter before you sweep.** A search sweep with no filters
  is a hundred replies to strangers, which is what a spam account looks like.
- **Safe preset or slower** for accounts under a year old or under a thousand followers.
- **Stop when actions start failing.** The browser script does this for you after
  three failures; when it happens, wait an hour.
- **Replies are public and permanent.** Read a dry run's generated replies before
  letting a model post as you. A bad brief produces a hundred bad replies.
- **One feed per session.** Sweeping several back to back multiplies the write
  count X sees.

Related: [Engagement Booster](engagement-booster.md) for the score-driven
version, [browser scripts](browser-scripts.md) for the catalog,
[CLI reference](cli-reference.md), [MCP setup](mcp-setup.md).

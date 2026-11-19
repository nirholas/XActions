# Account briefs: research the accounts you are about to tag

> Give `xactions brief` the accounts you plan to post about. It reads each one and returns one brief: what they are posting, the numbers they publish about themselves with links to the source posts, their account stats, who they tag, and other accounts your list keeps mentioning.

A post that tags an account and quotes its own numbers back to it gets more
interaction than a generic shout-out. The account is more likely to repost it,
and its audience sees it. Writing that post means first finding out what each
account has been posting, and that means reading every timeline by hand. This
command does the reading.

| Surface | Entry point |
|---------|-------------|
| CLI | `xactions brief` ([`src/cli/commands/brief.js`](../src/cli/commands/brief.js)) |
| MCP tool | `x_account_brief` ([`src/mcp/local-tools.js`](../src/mcp/local-tools.js)) |
| Library | `buildAccountBrief`, `buildEcosystemBrief`, `extractFigures` ([`src/analysis/accountBrief.js`](../src/analysis/accountBrief.js)) |

The CLI and the MCP tool run the same code ([`src/analysis/briefSource.js`](../src/analysis/briefSource.js))
and share one cache.

---

## Quick start

```bash
xactions brief coinbasedev base --topic x402
```

For a list you will reuse, put it in a file: one handle per line, or comma
separated, with `#` comments. Leading `@` signs and profile URLs are fine.

```text
# accounts.txt: x402 ecosystem
@base
@CoinbaseDev
https://x.com/someproject
```

```bash
xactions brief --file accounts.txt --topic "x402,agent payments" -o brief.md
```

## What is in the brief

**Tag line.** Every account on the list as `@handle @handle ...`, ready to paste.

**Also worth tagging.** Accounts that more than one account on your list
mentions, reposts or quotes, but that are not on the list. These are usually
the ecosystem's other players. With a single account, it lists who that account
mentions most.

**Per account:**

| Section | What it holds |
|---------|---------------|
| Account stats | Followers and average daily growth, best post against their typical post, typical interactions and views, posting rate. Each figure comes from the same arithmetic as `xactions analyze`. |
| Numbers they are posting | Figures from the account's own posts, such as `$2.4M`, `340%`, `10x`, `1.2M transactions` or `12,000 developers`. Each figure appears with the sentence it came from and a link to the post. On-topic posts come first. |
| Posts about the topic | Posts that match `--topic` in their text, hashtags, tagged accounts or links. |
| Recent posts | The account's latest originals and quotes. Replies and reposts are left out. |
| Tags most / Reposts and quotes / Links to | Who the account is connected to, and where it sends people. |

The figure extractor is conservative on purpose. Dates, times of day, version
numbers, contract addresses, "in 2 hours" and small counts such as "3
integrations" are skipped. Numbers inside reposts are skipped too, because they
belong to someone else.

## Options

| Flag | Default | |
|------|---------|---|
| `-f, --file <path>` | | Read accounts from a file |
| `-t, --topic <keywords>` | | Comma-separated keywords that make a post on topic |
| `-l, --limit <n>` | 100 | Posts read per account (10 to 400) |
| `-d, --days <n>` | 30 | Only list posts and figures from the last N days |
| `--recent <n>` | 5 | Recent posts listed per account |
| `-o, --output <file>` | | `.md` writes the Markdown, `.json` writes the full data |
| `--json` | | Print the full data as JSON |
| `--compact` | | One line per account (global flag; works with `--fields`) |
| `--refresh` | | Ignore the cache |
| `--cache-hours <n>` | 6 | How long a fetched timeline is reused; `0` turns the cache off |

The command exits with code 0 when every account was read, 2 when some failed
(the failures are listed under "Not included", or on stderr with `--json` and
`--compact`), and 1 when none could be read.

## Working efficiently

- **The cache.** Each account's profile and timeline sample is saved under
  `~/.xactions/cache/brief/` (or `$XACTIONS_HOME`). If you re-run the same list
  while drafting, or add one account to it, only the new or stale accounts are
  fetched. A fully cached run makes no requests. An account whose timeline
  comes back empty is reported as a failure and never cached, so the next run
  tries it again instead of answering with a cached zero.
- **One account at a time.** Accounts are read in sequence, not in parallel.
  The rate limit belongs to the session, so parallel reads only hit it sooner.
  An account that fails is recorded and the run carries on.
- **Logged in or not.** A brief works with no login. Without a session, though,
  X often returns an account's popular posts from across its history instead of
  its latest ones. The brief detects this and says so for each affected
  account, because "recent posts" from that sample would be wrong. For the
  latest posts, log in once with `xactions connect` or
  `xactions login --from-browser chrome`, then re-run with `--refresh`.

## Drafting posts from a brief

The Markdown is meant to be handed to whoever writes the post, human or model:

```bash
xactions brief --file accounts.txt --topic x402 -o brief.md
```

Then ask your LLM to draft posts that tag these accounts and cite their own
figures. Each figure carries its source link, so every claim in a draft can be
checked before it goes out.

From scripts:

```bash
# Accounts several of yours mention but you are not tagging yet
xactions brief --file accounts.txt --json | jq -r '.alsoTag[].username'

# Every figure, with its source
xactions brief --file accounts.txt --json \
  | jq -r '.accounts[] | .username as $u | .figures[] | "\($u)\t\(.figures | map(.value) | join(", "))\t\(.url)"'
```

## From an agent

With the MCP server loaded (the tool is in the `analytics` group):

```text
x_account_brief({ usernames: ["base", "CoinbaseDev"], topic: "x402" })
```

The tool returns `{ brief, tagLine, alsoTag, failures }`, with `brief` as the
Markdown. Pass `format: "json"` for the structured data. A single call takes up
to 25 accounts.

# Organizations: run a family of X accounts as a team

`xactions org` is for teams that run several X accounts in the open: a newsroom with
main, breaking and regional handles, a company with main, dev, status and support
accounts, or a brand whose affiliates post on its behalf and say so.

What it gives you:

- **Roles.** Owner, admin, editor, writer, viewer. Writers draft, editors approve and
  publish, admins connect accounts, owners change settings.
- **Approval before anything ships.** Every post starts as a draft. Editing an approved
  post sends it back to draft. Two-person approval is a setting.
- **Cross-posting that follows X's rules.** One post has a primary account, plus a
  variant written for each other account or a repost of the primary. Variants that are
  too alike are refused, and so is a post that repeats what another account published
  in the last seven days.
- **Disclosure on affiliate posts.** Accounts marked `affiliate` get `#ad` (or your tag)
  added to every post and cannot repost, because a repost cannot carry a disclosure.
- **A checked identity on every write.** Before posting, the saved session is checked to
  log in as the handle it was saved for. A session for the wrong account fails instead
  of posting.
- **Daily caps.** Every write is charged against the same per-account 24 hour ledger the
  MCP server uses.
- **A tamper-evident audit log.** Every change is one line in a SHA-256 hash chain, so
  `xactions org log --verify` shows the first line someone edited.
- **Encrypted sessions.** Set `XACTIONS_ORG_KEY` and each account's cookie jar is stored
  with AES-256-GCM.
- **A calendar and stats** across every account.

What it does not do, on purpose: buy accounts, take over accounts, rotate proxies, or
make accounts look unrelated. Accounts in an organization belong together in public,
so there is nothing to hide. If a plan only works while X can't tell the accounts are
linked, X will suspend all of them once it can.

## Quick start

```bash
# 1. Create the org. You are its owner.
xactions org create acme --owner nich --name "Acme Inc"

# 2. Add the team
xactions org member add acme rae --role editor
xactions org member add acme sam --role writer

# 3. Connect accounts. Each session is checked to log in as the handle you give.
export XACTIONS_ORG_KEY='a long passphrase'          # optional: encrypt sessions at rest
xactions org account add acme acme       --label main   --cookies-file acme.cookies.txt
xactions org account add acme acmedev    --label dev    --cookies-file acmedev.cookies.txt
xactions org account add acme acmestatus --label status --from-browser chrome
xactions org account add acme creatorjo  --kind affiliate --cookies-file jo.cookies.txt

# 4. A writer drafts one announcement across three accounts
export XACTIONS_ORG_MEMBER=sam
xactions org draft acme \
  --account acme       --text "Acme 2.0 is here. Builds are twice as fast." \
  --variant "acmedev=Devs: 2.0 ships incremental compiles and a new CLI. Migration guide in the docs." \
  --repost acmestatus \
  --at 2026-12-01T15:00:00Z

# 5. An editor reviews and approves
xactions org posts acme --as rae
xactions org post acme p_04c09090 --as rae
xactions org approve acme p_04c09090 --as rae

# 6. Publish what is due. Run this from cron for scheduled posts.
xactions org publish acme --as rae --dry-run
xactions org publish acme --as rae
```

Session sources for `account add` are the same as `xactions login`:

| Flag | Reads |
|---|---|
| `--cookies-file <path>` | Netscape `cookies.txt`, Cookie-Editor or EditThisCookie JSON, Playwright or Puppeteer `storageState`, or a raw `auth_token=...; ct0=...` string |
| `--from-browser [name]` | x.com cookies from a local chrome, chromium, brave, edge, arc or firefox |
| `--from-saved` | the session `xactions connect` or `xactions login` already saved |

Identity is checked with the `twid` cookie, so export the full cookie jar. `--no-verify`
skips the check; the account then shows as `unverified` in `xactions org show`, and the
check still runs before the first publish.

## Who is acting

Every command that reads or changes an org takes `--as <member>`. Without it, the
`XACTIONS_ORG_MEMBER` environment variable is used, and if the org has only one member,
that member is used.

| Role | Can |
|---|---|
| owner | everything, including settings and other owners |
| admin | connect and remove accounts; add, change and remove members below admin |
| editor | approve, reject and publish; edit anyone's post |
| writer | draft; edit their own posts |
| viewer | read the queue, the calendar, the stats and the log |

There must always be at least one owner.

> **Roles are an accountability workflow, not a security boundary.** Everything lives in
> files under `XACTIONS_HOME`, and anyone who can write those files can edit them
> directly. The hash-chained audit log is what makes that visible. For separation
> between people, give each person their own machine account and share only the org
> directory, with filesystem permissions to match.

## Posts

A post is one announcement across one or more accounts:

- the **primary**: the account it belongs to, with its text (`--account`, `--text`)
- **variants**: other accounts with wording of their own (`--variant handle=text`, repeatable)
- **reposts**: other accounts that repost the primary once it is live (`--repost handle`, repeatable)

```
draft ──approve──▶ approved ──publish──▶ published
  ▲                   │                 ├─▶ partial  (some accounts failed)
  └──────edit─────────┘                 └─▶ failed
  │
  └──reject──▶ rejected ──edit──▶ draft
```

`--at` schedules a post. A scheduled post publishes on the first `xactions org publish`
after that time; one without `--at` publishes on the next run after approval.
`xactions org publish --id <id>` publishes one post right away, whatever its schedule.

### The duplicate check

X's automation rules forbid posting identical or substantially similar content across
accounts you operate, including accounts one organization openly runs. Two texts are
compared as word pairs after lower-casing and removing links and punctuation, so
changing a link, an emoji or the capitalisation does not make a post different.
Writing the news for each audience does.

The default threshold is 0.8 (80% of word pairs shared). An owner can set it anywhere
from 0.5 to 1 with `xactions org settings acme --threshold 0.7`.

When the check refuses a draft, either rewrite the variant or use `--repost`.

### Affiliates

`--kind affiliate` marks an account that posts on the brand's behalf but is not the
brand: a creator, an employee advocate, a partner. Every post from it must carry a
disclosure:

- the tag is the account's own `--disclosure`, else the org's (`#ad` by default,
  change it with `xactions org settings acme --disclosure "#sponsored"`)
- a missing tag is added to the end of the text, and the writer is told
- affiliate accounts cannot be repost targets

This follows the FTC's endorsement guides and X's paid-partnership policy. It is not
legal advice; check what your jurisdiction requires.

## Publishing

`xactions org publish <org>` goes through every approved post that is due. Within a post,
the primary goes first, then the variants, then the reposts, with `--delay` seconds
(3 by default) between writes. Before each write:

1. The account's daily cap is charged. A target over its cap stays pending for the next run.
2. The session is checked to log in as that handle, once per account per run.

| Outcome | Meaning |
|---|---|
| `published` / `reposted` | done, with the post id |
| `capped` | over the 24 hour cap; still pending |
| `waiting` | a repost whose primary has not published yet; still pending |
| `failed` | X refused, the session is for another account, or the account was disconnected |
| `unconfirmed` | X accepted the write but returned no post id. Not retried, because a retry could post twice. Check the account. |

`--retry-failed` sets failed targets back to pending before the run. `--dry-run` prints
the plan and writes nothing.

For scheduled posts, run publish from cron as an editor:

```cron
*/5 * * * * XACTIONS_ORG_MEMBER=publisher XACTIONS_ORG_KEY=... xactions org publish acme --json >> ~/acme-publish.log 2>&1
```

Give the cron job a member of its own (`xactions org member add acme publisher --role editor`)
so the audit log shows which writes were scheduled.

## Calendar, stats and the log

```bash
xactions org calendar acme --days 30      # drafted and approved posts by day; overdue first
xactions org stats acme --days 30         # per account: followers, published, likes, reposts, views, cap left
xactions org log acme --limit 100         # who did what, when
xactions org log acme --verify            # check every hash in the chain
```

`stats` reads public profiles and the public metrics of up to 20 of each account's
recent posts that went out through the org. It needs no login.

## Agents

The MCP server has an `orgs` tool group:

| Tool | Does |
|---|---|
| `x_org_list` | list organizations |
| `x_org_queue` | one org's posts and connected accounts |
| `x_org_calendar` | drafted and approved posts by day |
| `x_org_draft` | draft a post into the queue as a member |

There is no tool to approve or publish. An agent can fill the queue, and a person at the
terminal decides what ships. Give the agent a member of its own so its drafts are
labelled:

```bash
xactions org member add acme agent --role writer
XACTIONS_ORG_MEMBER=agent npx xactions-mcp --tools orgs,read
```

## Files

```
$XACTIONS_HOME/orgs/<org>/
  org.json            settings, members, accounts
  posts.json          the queue and publish results
  audit.jsonl         hash-chained log
  sessions/<h>.json   one cookie jar per account, mode 0600, encrypted when XACTIONS_ORG_KEY is set
```

`XACTIONS_HOME` defaults to `~/.xactions`. Each read-change-write holds a lock file, so
a cron publish and an editor approving at the same moment do not overwrite each other.

## Library

```js
import { createOrg, createPost, approvePost, publishDue } from 'xactions/orgs';
```

Every CLI command is a thin wrapper over a function in [`src/orgs/`](../src/orgs/).

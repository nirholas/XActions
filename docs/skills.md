# Skills Reference

**Skills** are self-contained instruction files that teach an AI assistant how to
do one job with XActions. Each is a markdown file with YAML frontmatter, written
for a model to read rather than a human: it names the scripts to run, the page
to run them on, the arguments that matter, and the mistakes to avoid.

They are how you get from "Claude has 153 tools" to "Claude knows which three of
them to use, in what order, for this task."

- Location: [`skills/`](../skills/)
- Machine-readable index: [`skills/index.json`](../skills/index.json)
- Template for new ones: [`skills/TEMPLATE.md`](../skills/TEMPLATE.md)
- Format: the [Agent Skills specification](https://agentskills.io/specification),
  so any installer that follows it resolves this tree

---

## Using them

### Install into your agent

The CLI ships the whole catalogue and can copy any skill into the directory
your coding agent already reads. Nothing is fetched: `xactions skills` resolves
the `skills/` directory relative to the installed package, so it works from a
global `npm install -g xactions` as well as a clone.

```bash
xactions skills list                                   # every skill, and where each is installed
xactions skills show follower-monitoring               # print one SKILL.md in full
xactions skills install --all --global                 # Claude Code, for every project: ~/.claude/skills/<id>/
xactions skills install growth-automation              # Claude Code, this project only: ./.claude/skills/<id>/
xactions skills install --all --target cursor          # ./.cursor/rules/<id>.mdc
xactions skills install --all --target codex --global  # ~/.codex/skills/<id>/
xactions skills install --all --target windsurf        # ./.windsurf/rules/<id>.md
xactions skills uninstall --all --target cursor
```

Where each target puts things, and what it writes:

| `--target` | Destination | What lands there |
|---|---|---|
| `claude` (default) | `~/.claude/skills/<id>/` with `--global`, else `./.claude/skills/<id>/` | The skill directory, copied whole, so `references/` and relative script paths keep working |
| `project` | `./.claude/skills/<id>/` | Same as `claude` without `--global` |
| `cursor` | `./.cursor/rules/<id>.mdc` | SKILL.md wrapped in `.mdc` frontmatter (`description`, `globs: []`, `alwaysApply: false`) |
| `codex` | `~/.codex/skills/<id>/` with `--global`, else `./.codex/skills/<id>/` | The skill directory, plus a managed block in `./AGENTS.md` listing every installed SKILL.md |
| `windsurf` | `./.windsurf/rules/<id>.md` | SKILL.md wrapped in Windsurf frontmatter (`trigger: model_decision`) |

`cursor`, `windsurf` and `project` are per-project by definition, so `--global`
is ignored for them and the command says so.

Every run is idempotent and reports what it did per skill: `installed`,
`updated` (the copy on disk was stale), `unchanged`, `removed`, or `absent`.
The rules-file targets carry a `Source:` line naming the package's skill
directory, because a SKILL.md refers to its scripts by relative path and the
agent needs to know where those resolve. `--json` on any sub-command prints
the same report as JSON.

`xactions doctor` reports how many skills are installed per target, and
`xactions skills list` marks each skill with where it was found.

Skills and MCP tool groups solve the same problem from two directions. A skill
tells the model which tools to reach for; `npx xactions-mcp --tools <groups>`
stops it from seeing the rest at all. Pairing a narrow skill with a narrow tool
allowlist is the strongest setup: see [MCP Setup](mcp-setup.md).

### Install with any spec-compliant installer

Every skill here follows the [Agent Skills
specification](https://agentskills.io/specification): a `skills/<name>/`
directory holding a `SKILL.md` whose frontmatter carries `name` and
`description`. That is the layout third-party installers look for, so the
cross-agent installer from vercel-labs resolves the catalogue straight from
GitHub:

```bash
npx skills add nirholas/XActions            # pick from the list interactively
npx skills add nirholas/XActions --list     # see what is there, install nothing
npx skills add nirholas/XActions --all      # every skill, every detected agent
```

It walks `skills/`, reads each `SKILL.md` frontmatter, and links or copies the
whole skill directory (`references/` included) into whichever agent directories
it finds on the machine. `xactions skills install` above is unaffected and
still the right tool when XActions is already installed.

### With Claude Code

Point Claude at the directory. It reads the frontmatter `description` of each
skill to decide which one applies to your request:

```bash
claude "Read skills/follower-monitoring/SKILL.md and find who unfollowed me this week"
```

### With any assistant

Skills are plain markdown. Paste the contents of a `SKILL.md` into any chat and
the assistant has everything it needs for that job:

```
[paste skills/growth-automation/SKILL.md]

Now set this up for the "AI engineering" niche.
```

### Programmatically

```js
import { readFileSync } from 'node:fs';

const index = JSON.parse(readFileSync('skills/index.json', 'utf8'));
const skill = index.skills.find((s) => s.id === 'follower-monitoring');
const instructions = readFileSync(skill.path, 'utf8');

// Hand `instructions` to your model as a system or user message.
```

---

## Anatomy of a skill

```markdown
---
name: growth-automation
description: Automates X/Twitter growth via browser console scripts. Auto-likes
  tweets by keyword/user filters, auto-comments on target users... Use when
  automating Twitter growth, engagement, following, or audience building.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "4.0"
---

# Growth Automation

Browser console scripts for X/Twitter. **Always paste `src/automation/core.js`
first** -- it provides shared config, selectors, utilities, and rate limiting.

## Script Selection

| Goal | File |
|------|------|
| Auto-like timeline tweets | `src/automation/autoLiker.js` |
| Follow users by keyword search | `src/automation/keywordFollow.js` |
```

The `description` is the load-bearing field. It is the only thing an assistant
reads when deciding whether a skill is relevant, so it has to state both what
the skill does *and* when to reach for it. A description that only says what it
does will never get selected.

### Frontmatter rules

`name` and `description` are required. The [spec](https://agentskills.io/specification)
allows four more keys and nothing else: `license`, `compatibility`, `metadata`,
and the experimental `allowed-tools`. An installer that finds an unknown key or
a missing required one skips the skill entirely, which is worse than a bad
description because nothing tells the user it happened.

| Field | Rule |
|---|---|
| `name` | Required. 1 to 64 characters, lowercase letters, digits and single hyphens. No leading, trailing or doubled hyphen. **Must match the directory name** |
| `description` | Required. 1 to 1024 characters. What it does and when to use it |
| `license` | Optional. `Apache-2.0` here |
| `compatibility` | Optional, up to 500 characters. Only when the skill needs something specific from the environment |
| `metadata` | Optional. String keys to string values. We use `author` and `version`, and `version` must be quoted so YAML keeps `"4.0"` a string |
| `allowed-tools` | Optional, experimental. A space-separated list of pre-approved tools |

One YAML trap worth naming, because it costs a skill its whole entry: an
unquoted scalar cannot contain a colon followed by a space. `description: Runs
the server: fast` is a parse error, not a long description. Rephrase, or quote
the value.

---

## The catalog

_50 skills. Generated from [`skills/index.json`](../skills/index.json)._

| Skill | What it covers |
|-------|----------------|
| [A2A Multi-Agent](../skills/a2a-multi-agent/SKILL.md) | Agent-to-Agent protocol integration for multi-agent workflows. |
| [Account Backup](../skills/account-backup/SKILL.md) | Export and backup X/Twitter account data — tweets, likes, bookmarks, followers, and following. |
| [Account Tools](../skills/account-tools/SKILL.md) | Miscellaneous account utilities — view join date, login history, connected accounts, appeal suspensions. |
| [Algorithm Cultivation](../skills/algorithm-cultivation/SKILL.md) | Trains feed algorithm for niche content, runs 24/7 LLM-powered thought leader engagement. |
| [Analytics & Insights](../skills/analytics-insights/SKILL.md) | Analyze engagement, hashtags, competitors, best posting times, follower demographics, tweet performance. |
| [Articles & Longform](../skills/articles-longform/SKILL.md) | Compose, preview, publish, and manage long-form Articles on X/Twitter (Premium+ feature). |
| [Billing Management](../skills/billing-management/SKILL.md) | Manage XActions subscriptions and billing via Stripe checkout. |
| [Blocking & Muting](../skills/blocking-muting-management/SKILL.md) | Mass block, unblock, mute, unmute with bot detection. |
| [Bookmarks Management](../skills/bookmarks-management/SKILL.md) | Organize, export, and bulk-clear bookmarks with auto-tagging. |
| [Business & Ads](../skills/business-ads/SKILL.md) | Brand monitoring, audience insights, competitor analysis, and ad campaign management. |
| [Community Health Monitoring](../skills/community-health-monitoring/SKILL.md) | Audit follower quality, engagement authenticity, unfollower patterns, and network efficiency. |
| [Community Management](../skills/community-management/SKILL.md) | Bulk-join/leave X communities, manage memberships. |
| [Community Notes](../skills/community-notes/SKILL.md) | View, write, rate, and browse Community Notes on posts. |
| [Competitor Intelligence](../skills/competitor-intelligence/SKILL.md) | Analyze competitor profiles, content strategy, audience, and engagement patterns. |
| [Content Cleanup](../skills/content-cleanup/SKILL.md) | Mass unlike, clear reposts/retweets, delete tweets, clear bookmarks and history. |
| [Content Posting](../skills/content-posting/SKILL.md) | Post tweets, threads, polls; schedule posts; create reposts programmatically. |
| [Content Repurposing](../skills/content-repurposing/SKILL.md) | Identify top tweets and generate repurposed threads, carousels, and variations. |
| [Creator Monetization](../skills/creator-monetization/SKILL.md) | Ad revenue analytics, subscription management, and creator monetization features. |
| [CRM Management](../skills/crm-management/SKILL.md) | Tag, segment, and track followers and contacts with a built-in CRM. |
| [Delegate Access](../skills/delegate-access/SKILL.md) | Add, remove, and manage delegate accounts that can post/like on your behalf. |
| [Direct Messages](../skills/direct-messages/SKILL.md) | Send, manage, and automate DMs with personalized bulk messaging and templates. |
| [Discovery & Explore](../skills/discovery-explore/SKILL.md) | Trending topics, content search, account discovery, and explore page automation. |
| [Engagement & Interaction](../skills/engagement-interaction/SKILL.md) | Auto-like, unlike, reply, bookmark, hide replies, and bulk engagement actions. |
| [Follower Monitoring](../skills/follower-monitoring/SKILL.md) | Detect unfollowers, track follower changes, and set up continuous monitoring. |
| [Graph Analysis](../skills/graph-analysis/SKILL.md) | Analyze follower/following network graphs — clusters, influencers, bridges, audience segments. |
| [Grok AI](../skills/grok-ai/SKILL.md) | Grok AI chat, image generation, tweet analysis, and content creation. |
| [Growth Automation](../skills/growth-automation/SKILL.md) | Auto-like by keyword/user, auto-follow engagers, keyword-based following for organic growth. |
| [Lead Generation](../skills/lead-generation/SKILL.md) | Find and qualify B2B leads from X conversations using keyword search and profile analysis. |
| [Lists Management](../skills/lists-management/SKILL.md) | Create, populate, and export X/Twitter lists with bulk member management. |
| [Media Studio](../skills/media-studio/SKILL.md) | Navigate X Media Studio, upload media, manage library, view media analytics. |
| [Notifications Management](../skills/notifications-management/SKILL.md) | Filter, bulk-manage, and scrape notifications; auto-respond to mentions. |
| [Post Editing](../skills/post-editing/SKILL.md) | Edit existing posts or undo a recently posted tweet (Premium feature). |
| [Premium & Subscriptions](../skills/premium-subscriptions/SKILL.md) | Detect Premium plan, verify feature access, and manage subscription features. |
| [Profile Management](../skills/profile-management/SKILL.md) | Update bio, avatar, header image, display name, location, website, and pinned tweet. |
| [Reputation Audit](../skills/reputation-audit/SKILL.md) | AI risk-scores your own posts (professional, hostile, legal, spam), produces a 0-100 reputation score with a shareable card, and offers one-click cleanup of what it flags. |
| [Saved Searches](../skills/saved-searches/SKILL.md) | Create, manage, and run saved searches on X/Twitter. |
| [Settings & Privacy](../skills/settings-privacy/SKILL.md) | Manage protected tweets, muted words, connected apps, and notification preferences. |
| [Spaces & Live](../skills/spaces-live/SKILL.md) | Join X Spaces, scrape metadata, discover live rooms, and schedule Spaces. |
| [Teams Management](../skills/teams-management/SKILL.md) | Create teams, invite members, assign roles, and collaborate on automation. |
| [Timeline Viewing](../skills/timeline-viewing/SKILL.md) | Switch timelines (For You/Following), auto-scroll, and scrape timeline data. |
| [Topic Management](../skills/topic-management/SKILL.md) | Browse, follow, and unfollow X Topics; manage followed topics. |
| [Twitter Scraping](../skills/twitter-scraping/SKILL.md) | Scrape profiles, followers, tweets, media, and bookmarks without API access. |
| [Unfollow Management](../skills/unfollow-management/SKILL.md) | Mass unfollow everyone, only non-followers, with smart time-based rules and whitelists. |
| [Video Downloading](../skills/video-downloading/SKILL.md) | Download videos and GIFs from X/Twitter posts — single video, batch, or via CLI. |
| [Viral Thread Generation](../skills/viral-thread-generation/SKILL.md) | Research trending topics and generate high-engagement thread content. |
| [Webhooks](../skills/webhooks/SKILL.md) | Create, manage, and test webhooks for automation job notifications. |
| [X Pro Management](../skills/x-pro-management/SKILL.md) | Navigate X Pro (TweetDeck), set up monitoring columns, manage multi-column view. |
| [x402 Payments](../skills/x402-payments/SKILL.md) | Enable x402 crypto payment protocol for XActions API access — multi-chain, multi-currency. |
| [XActions CLI](../skills/xactions-cli/SKILL.md) | Command-line interface for scraping, MCP server config, and automation — `npm install -g xactions`. |
| [XActions MCP Server](../skills/xactions-mcp-server/SKILL.md) | 154 MCP tools for AI agents to automate X/Twitter (scrape, post, engage, analyze). |

---

## Writing one

1. Copy [`skills/TEMPLATE.md`](../skills/TEMPLATE.md) to `skills/your-skill/SKILL.md`.
2. Write the frontmatter. Spend the effort on `description`: name the job and
   the trigger. Compare "Manages bookmarks" with "Organize, export, and
   bulk-clear bookmarks with auto-tagging. Use when someone asks to clean up,
   export, or categorize their saved posts."
3. Write the body for a model, not a person. Concrete file paths, exact page
   URLs, real argument values. Skip the motivation and the history.
4. Lead with a selection table mapping goals to files, so the assistant picks
   correctly before it reads any detail.
5. Add the entry to [`skills/index.json`](../skills/index.json).
6. Check that an outside installer can still read the whole catalogue:

   ```bash
   npx skills add . --list        # from the repo root: should list every skill
   xactions skills list           # our own installer, same count
   ```

   A skill with broken frontmatter is not reported as broken by either tool. It
   is silently absent from the list, so compare the count against the number of
   directories under `skills/`.

Rules that keep a skill useful:

- **Reference real files.** Every path in a skill must exist. A skill that sends
  an agent to a missing script is worse than no skill.
- **State the preconditions.** "Paste `core.js` first", "must be on
  `x.com/USERNAME/followers`", "requires a logged-in session."
- **Say what not to do.** Rate limits, dry-run defaults, and destructive steps
  belong in the skill, because the agent will not infer them.
- **No placeholders.** No `TODO`, no invented arguments.

---

## Related

- [MCP Setup](mcp-setup.md): the 154 tools skills drive
- [Browser Scripts](browser-scripts.md): what most skills reference
- [Agents](agents.md): the autonomous agent that consumes skills
- [AGENTS.md](../AGENTS.md): integration notes for AI coding assistants, and when to shell out to the CLI instead of loading the MCP server

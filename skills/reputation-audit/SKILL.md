---
name: reputation-audit
description: AI risk-scores an account's own posts across professional, hostile, legal, and spam exposure, produces a 0-100 reputation score with a shareable card, and offers one-click cleanup of what it flags. Use when a user wants to audit their own timeline for embarrassing or risky posts, "clean up my account before a job search", or check what they said that could come back to bite them.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Reputation Audit

Scores your own posts against a risk rubric with one LLM call per post, then rolls
the verdicts into a 0-100 reputation score, a letter grade, and the specific posts
worth a second look. Three surfaces share one scoring engine
(`src/ai/reputationScorer.js`): a browser script that also renders a downloadable,
shareable score card image; a CLI command for scripting; and an API route for
agents.

This audits *your own* content for risk, not someone else's account and not
follower quality. For follower/network audits, use
[Community Health Monitoring](../community-health-monitoring/SKILL.md). For
bulk-deleting by age, keyword, or engagement rather than AI-judged risk, use
[Content Cleanup](../content-cleanup/SKILL.md).

## The rubric

Every post is scored 0 (no risk) to 100 (severe) on up to four dimensions in a
single model call, plus an optional custom question:

| Dimension | Question |
|-----------|----------|
| 💼 Professional | Would this embarrass the author to an employer, client, or business partner? |
| ⚔️ Hostile | Is this a personal attack on someone named or identifiable? |
| ⚖️ Legal exposure | Defamation, doxxing, a threat, leaked confidential info, an unkeepable promise? |
| 🗑️ Low value | Low-effort spam or filler that adds nothing? |

The overall score for a post is the MAX across its dimensions, not the average:
one severe dimension and three clean ones is still a post worth flagging.
Verdict: `flagged` at 70+, `review` at 40-69, `clean` below 40
(`FLAG_THRESHOLD` / `REVIEW_THRESHOLD` in the scorer module).

The account-level reputation score blends the average risk across all scanned
posts (60%) with the single worst post (40%), so one severe outlier still pulls
the grade down even when everything else is clean.

The report carries `dimensionAverages` and `dimensionPeaks` side by side. Read
and present the peak, not just the average: one post at 92 among four clean ones
averages to 18, and reporting only that contradicts the grade the same report
gives.

## Browser script (with the shareable score card)

**File:** `scripts/reputationAudit.js` — full guide: `docs/reputation-audit.md`

The only surface that renders the downloadable/copyable PNG score card.

### How to use

1. Open the user's own profile: `x.com/USERNAME` (or `/with_replies`, the
   biggest source of risk on most accounts)
2. DevTools (F12) then Console
3. Paste the script. A panel appears bottom-right pre-loaded with all four
   dimensions on
4. Click Scan. Read the score, download or copy the card, optionally clean up
   what got flagged (its own dry run, off by default)

### What to tell the user

- Scanning only reads and scores. Nothing is touched until Cleanup runs, and
  that starts in dry run.
- Cleanup reuses the same verified-delete logic as `scripts/searchSweep.js`
  and only ever touches the account's own posts.
- The card downloads as a 1200x675 PNG (X's own card ratio) or copies straight
  to the clipboard to paste into a new post.
- Scored posts are cached locally for 14 days by id + rubric, so re-scanning
  after a cleanup or the next day does not re-bill already-scored posts.

## CLI

**File:** `src/cli/commands/reputation.js`

```bash
xactions reputation USERNAME
xactions reputation USERNAME --replies --limit 200
xactions reputation USERNAME --dimensions hostile,legal --custom-question "Does this reveal my employer?"
GROQ_API_KEY=gsk_... xactions reputation USERNAME --json   # free models; a free-tier key adds capacity
```

Prints the score, a bar per dimension, and the flagged/review posts with the
reason each was flagged. `--json` for scripting; no card image (terminal-only,
point the user to the browser script for that).

## SDK / API

**Module:** `src/ai/reputationScorer.js`, exported from the package root as
`scorePost`, `scorePosts`, `summarizeReport`, `scoreToGrade`, `DIMENSIONS`.

```js
import { scorePosts, summarizeReport } from 'xactions';

const scores = await scorePosts(posts, { provider: 'xai', apiKey, dimensions: ['professional', 'legal'] });
const report = summarizeReport(posts, scores);
```

**API:** `POST /api/ai/reputation/score` (x402-priced, `reputation:score`,
$0.01/call) takes `{ posts, dimensions?, customQuestion?, provider?, model?,
apiKey? }` and returns `{ report, scores }`. `GET /api/ai/reputation/dimensions`
lists the rubric with no payment required. Both are documented in
`/openapi.json` under the `Reputation` tag for agent discovery.

## Any LLM provider

xAI (Grok) works straight from the browser console: x.com's
Content-Security-Policy allows `api.x.ai`. OpenAI, Anthropic, OpenRouter, and
Ollama need the browser extension bridge (`extension/`), or use the CLI/SDK,
which has no CSP to work around.

## Related Skills

- **content-cleanup** — bulk-delete by age/keyword/engagement instead of AI-judged risk
- **community-health-monitoring** — audits your followers and network, not your own posts
- **analytics-insights** — general engagement and performance analytics

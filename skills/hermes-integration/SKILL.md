---
name: hermes-integration
description: Integrates XActions with Hermes Agent for AI-powered Twitter/X content generation and posting. Hermes generates deslopped security content, sends it to the user for approval, then posts via XActions browser automation. Use when the user wants to generate Twitter content through Hermes, post security threads, or manage the content pipeline from Hermes to X/Twitter.
license: MIT
metadata:
  author: fisher
  version: "1.0"
---

# Hermes Integration

Bridge between Hermes Agent and XActions for Twitter/X content generation and posting.

## How It Works

1. **Hermes generates content** — security threads, vulnerability breakdowns, exploit analysis
2. **Deslop pass** — all output is run through deslop (no em dashes, AI vocabulary, hedging)
3. **User approval** — Hermes sends the content to the user. Nothing posts without explicit approval.
4. **XActions posts** — approved content is posted via XActions browser automation

## Content Pipeline

### Step 1: Generate

Hermes picks a topic from the security content pool (`~/.hermes/scripts/security-content-generator.py`) or generates a fresh take on a recent exploit.

Content types:
- **Single tweet** — one vulnerability insight, under 280 chars
- **Thread** — 3-8 tweets breaking down an exploit, with hook + value + CTA
- **Reply/comment** — response to trending security话题

### Step 2: Deslop

All content passes through the deslop pipeline before being shown to the user:
- Zero em dashes
- Contractions everywhere
- Varied sentence rhythm
- No AI vocabulary (robust, leverage, navigate, etc.)
- Opinions allowed
- Rough edges preserved

### Step 3: User Approval

Hermes sends the content to the user via Telegram. The user can:
- **Approve** — Hermes posts it via XActions
- **Edit** — user provides changes, Hermes applies and re-sends
- **Reject** — content is discarded, Hermes generates something else
- **Save for later** — content is stored in `~/.hermes/cron/output/` for manual posting

### Step 4: Post via XActions

Once approved, Hermes uses XActions to post:

**For threads:**
1. Open `x.com` in browser
2. Navigate to post composer
3. Use `src/postThread.js` — paste into DevTools console
4. Set `dryRun: false` and populate the `THREAD` array
5. Execute and verify

**For single tweets:**
1. Open `x.com` in browser
2. Use `src/postComposer.js` or navigate to compose
3. Type the approved content
4. Post and verify

## Hermes MCP Configuration

To use XActions MCP server with Hermes:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "FROM_ENV_FILE"
      }
    }
  }
}
```

**Important:** Never hardcode the session cookie. Always reference an environment variable or `.env` file that is in `.gitignore`.

## Environment Setup

Required in `.env` (never commit this file):

```bash
# XActions
XACTIONS_SESSION_COOKIE=your_auth_token_here
XACTIONS_MODE=local

# Optional: for AI-generated content via XActions
OPENROUTER_API_KEY=your_key_here
```

## Content Storage

- Generated content: `~/.hermes/cron/output/security-thread_*.txt`
- Sent threads log: `~/.hermes/scripts/sent-threads.json`
- Drafts for approval: `~/.hermes/cron/output/drafts/`

## Workflow Files

| File | Purpose |
|------|---------|
| `skills/hermes-integration/SKILL.md` | This file — integration guide |
| `skills/content-posting/SKILL.md` | Posting scripts and selectors |
| `skills/viral-thread-generation/SKILL.md` | Thread structure and hooks |
| `skills/engagement-interaction/SKILL.md` | Like, reply, bookmark automation |
| `skills/algorithm-cultivation/SKILL.md` | Feed training and growth |

## Rate Limits

Respect X/Twitter rate limits:
- 1-3 seconds between actions
- Max 300 actions per hour for engagement
- Thread posting: at least 2 seconds between tweets
- If rate limited, wait 15 minutes before retrying

## Safety Rules

1. **Never auto-post without user approval**
2. **Never commit `.env` files or session cookies**
3. **Always deslop content before showing the user**
4. **Log all sent content to prevent duplicates**
5. **Use dryRun: true when testing scripts**

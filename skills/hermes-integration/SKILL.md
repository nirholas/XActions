---
name: hermes-integration
description: Integrates XActions with Hermes Agent for AI-powered Twitter/X content generation. Hermes generates deslopped security content and sends it to the user for manual posting. No automation of posting — the user posts themselves. Use when the user wants to generate Twitter content through Hermes or manage the content pipeline from Hermes to X/Twitter.
license: MIT
metadata:
  author: fisher
  version: "1.1"
---

# Hermes Integration

Bridge between Hermes Agent and XActions for Twitter/X content generation.

## How It Works

1. **Hermes generates content** — security threads, vulnerability breakdowns, exploit analysis
2. **Deslop pass** — all output is run through deslop (no em dashes, AI vocabulary, hedging)
3. **User posts manually** — Hermes sends the content to the user. The user copies and posts it themselves.

That's it. No X API keys, no session cookies, no browser automation. Just content generation.

## Content Pipeline

### Step 1: Generate

Hermes picks a topic from the security content pool (`~/.hermes/scripts/security-content-generator.py`) or generates a fresh take on a recent exploit.

Content types:
- **Single tweet** — one vulnerability insight, under 280 chars
- **Thread** — 3-8 tweets breaking down an exploit, with hook + value + CTA

### Step 2: Deslop

All content passes through the deslop pipeline before being shown to the user:
- Zero em dashes
- Contractions everywhere
- Varied sentence rhythm
- No AI vocabulary (robust, leverage, navigate, etc.)
- Opinions allowed
- Rough edges preserved

### Step 3: User Posts

Hermes sends the content to the user via Telegram. The user:
- Copies the content
- Pastes it into X/Twitter
- Posts it manually

No automation. No API keys needed. The user stays in full control.

## Content Storage

- Generated content: `~/.hermes/cron/output/security-thread_*.txt`
- Sent threads log: `~/.hermes/scripts/sent-threads.json` (prevents duplicates)

## Workflow Files

| File | Purpose |
|------|---------|
| `skills/hermes-integration/SKILL.md` | This file — integration guide |
| `skills/content-posting/SKILL.md` | Posting scripts and selectors (for reference) |
| `skills/viral-thread-generation/SKILL.md` | Thread structure and hooks |
| `skills/engagement-interaction/SKILL.md` | Like, reply, bookmark automation |
| `skills/algorithm-cultivation/SKILL.md` | Feed training and growth |

## Safety Rules

1. **Never auto-post.** The user posts all content manually.
2. **Never commit `.env` files or session cookies** (for when automation is added later)
3. **Always deslop content before showing the user**
4. **Log all sent content to prevent duplicates**

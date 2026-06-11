# Hermes Agent Integration

XActions integrates with [Hermes Agent](https://hermes-agent.nousresearch.com/) for AI-powered Twitter content generation.

## Overview

1. **Hermes generates content** — security threads, vulnerability breakdowns, exploit analysis
2. **Deslop pass** — all output is stripped of AI patterns (no em dashes, hedging, AI vocabulary)
3. **User posts manually** — Hermes sends content to the user via Telegram. The user copies and posts it.

No X API keys. No session cookies. No browser automation. Just content generation.

## Quick Start

### 1. Generate Content

Hermes uses the security content pool at `~/.hermes/scripts/security-content-generator.py` to generate threads. Content is automatically deslopped.

### 2. Receive Content

Hermes sends content to the user via Telegram, 3 times daily:
- Morning (9:00 UTC)
- Afternoon (14:00 UTC)
- Evening (22:37 UTC)

### 3. Post Manually

The user copies the content and posts it to X/Twitter manually. No automation.

## Content Pipeline

```
Security Content Pool (26+ threads, auto-refreshed weekly)
        ↓
   Hermes picks topic (no repeats)
        ↓
   Deslop transformation
        ↓
   Hermes sends to user (Telegram)
        ↓
   User copies and posts manually
        ↓
   Log sent thread (no duplicates)
```

## Content Types

- **Single tweet** — one vulnerability insight, under 280 chars
- **Thread** — 3-8 tweets breaking down an exploit, with hook + value + CTA

## Safety

- **No auto-posting** — the user posts all content manually
- **No duplicate content** — sent threads are logged and never repeated
- **No secrets in repo** — `.env` is in `.gitignore`
- **No X API keys needed** — no automation means no keys

## Files

| File | Purpose |
|------|---------|
| `skills/hermes-integration/SKILL.md` | Full integration guide |
| `scripts/hermes-poster.js` | Format content for manual posting |
| `.env.example` | Environment template (for future automation) |

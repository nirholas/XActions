# Hermes Agent Integration

XActions integrates with [Hermes Agent](https://hermes-agent.nousresearch.com/) for AI-powered Twitter content generation and posting.

## Overview

1. **Hermes generates content** — security threads, vulnerability breakdowns, exploit analysis
2. **Deslop pass** — all output is stripped of AI patterns (no em dashes, hedging, AI vocabulary)
3. **User approval** — Hermes sends content to the user via Telegram. Nothing posts without approval.
4. **XActions posts** — approved content is posted via XActions browser automation

## Quick Start

### 1. Install XActions

```bash
npm install -g xactions
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your X/Twitter auth_token cookie
```

### 3. Configure Hermes MCP

Add to your Hermes MCP config:

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

### 4. Generate Content

Hermes uses the security content pool at `~/.hermes/scripts/security-content-generator.py` to generate threads. Content is automatically deslopped before being shown for approval.

### 5. Post Content

Once approved by the user, Hermes can:
- Post single tweets via `x_post_tweet`
- Post threads via `x_post_thread`
- Schedule posts via `x_schedule_post`

## Content Pipeline

```
Security Content Pool (26+ threads)
        ↓
   Hermes picks topic
        ↓
   Deslop transformation
        ↓
   User approval (Telegram)
        ↓
   XActions posts to X/Twitter
        ↓
   Log sent thread (no repeats)
```

## Safety

- **No auto-posting** — all content requires explicit user approval
- **No duplicate content** — sent threads are logged and never repeated
- **No secrets in repo** — `.env` is in `.gitignore`
- **Rate limits respected** — 1-3s delays between actions

## Files

| File | Purpose |
|------|---------|
| `skills/hermes-integration/SKILL.md` | Full integration guide |
| `scripts/hermes-poster.js` | Format content for posting |
| `config/hermes-mcp-config.json` | Hermes MCP server config |
| `.env.example` | Environment template |

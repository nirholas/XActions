```skill
---
name: grok-ai
description: Integrate with Grok AI features on X/Twitter including chat, content generation, image generation/editing, specialized agents, SuperGrok features, widgets, voice mode, and algorithm integration for post ranking.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Grok & AI Features with XActions

Interact with and automate Grok AI features on X/Twitter.

## Features

- **Grok AI Chat**: Queries, content generation, analysis
- **Image Generation**: Create images from prompts (Premium+)
- **Image Editing**: Modify existing images with AI (Premium+)
- **Grok Agents**: Specialized AI helpers for different tasks
- **SuperGrok**: Advanced mode ($60/mo) with unlimited agents, apps, projects
- **Widgets**: "Chat with Grok" and "Grok Voice Mode" on iOS (2026)
- **Algorithm Integration**: Grok evaluates posts for ranking (2026)
- **Content Suggestions**: AI-powered post improvement
- **Topic Summaries**: Grok summarizes trending topics (2026)

## Browser Console Script

**File:** `scripts/grokIntegration.js`

### How to use

1. Navigate to `x.com/i/grok` or click Grok in sidebar
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Grok nav | `a[href="/i/grok"]` |
| Chat input | `[data-testid="grokInput"]` |
| Send button | `[data-testid="grokSendButton"]` |
| Response area | `[data-testid="grokResponse"]` |
| New chat | `[data-testid="grokNewChat"]` |
| Image gen | `[data-testid="grokImageGen"]` |

## MCP Tools

- `x_grok_query` – Send a query to Grok
- `x_grok_generate_image` – Generate an image with Grok
- `x_grok_summarize` – Summarize a topic or thread
- `x_grok_analyze_post` – Analyze a post's potential reach

## API Endpoints

- `POST /api/grok/query` – Send a Grok query
- `POST /api/grok/image` – Generate an image
- `POST /api/grok/summarize` – Summarize content
- `POST /api/grok/analyze` – Analyze post quality

## Related Files

- `src/grokIntegration.js` – Core Grok integration module
- `scripts/grokIntegration.js` – Browser Grok script

## Notes

- Free tier: Limited Grok queries per day
- Premium: More queries, basic image gen
- Premium+: Unlimited queries, full image gen/edit
- SuperGrok ($60/mo): Separate xAI subscription, unlimited everything
- Grok now influences post ranking in the algorithm (2026)
- Users are responsible for AI-generated outputs
```

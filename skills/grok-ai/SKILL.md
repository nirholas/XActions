---
name: grok-ai
description: Integrates with X/Twitter's Grok AI for chat, image generation, tweet analysis, and content creation. Automates Grok prompts, scrapes Grok responses, and uses Grok for content strategy. Requires X Premium+. Use when users want to use Grok AI for content generation, analysis, or chat automation on X.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Grok AI Integration

Browser console scripts for automating interactions with X's built-in Grok AI assistant.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Chat with Grok | `src/grokIntegration.js` | `x.com/i/grok` |
| Generate images | `src/grokIntegration.js` | `x.com/i/grok` |
| Analyze tweet with Grok | `src/grokIntegration.js` | Any tweet |

## Grok Integration

**File:** `src/grokIntegration.js`

Automates Grok AI prompts and response scraping.

### How to Use
1. Navigate to `x.com/i/grok`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

### Controls
- `XActions.ask(prompt)` -- Send a prompt to Grok
- `XActions.scrapeResponse()` -- Capture Grok's latest response
- `XActions.generateImage(prompt)` -- Request image generation
- `XActions.batchAsk(prompts[])` -- Send multiple prompts sequentially
- `XActions.export()` -- Download conversation history as JSON

### Features
- Automated prompt submission with response capture
- Batch prompting for content generation workflows
- Image generation prompt automation
- Conversation history export
- Rate-limited to avoid triggering restrictions

## DOM Selectors

| Element | Selector |
|---------|----------|
| Grok input | `[data-testid="grokInput"]` or `textarea[placeholder]` |
| Send button | `[data-testid="grokSend"]` |
| Response container | `[data-testid="grokResponse"]` |
| Image output | `[data-testid="grokImage"]` |
| Grok nav | `a[href="/i/grok"]` |

## Content Strategy with Grok

### Using Grok for content ideation
1. `XActions.ask("What are the top 5 trending topics in {niche} right now?")`
2. `XActions.ask("Write 3 tweet variations about {topic}")`
3. `XActions.ask("Analyze this tweet for engagement: {tweet_text}")`
4. Capture responses with `XActions.scrapeResponse()`
5. Feed into `src/threadComposer.js` for thread creation

### Batch content generation
```javascript
await XActions.batchAsk([
  "Write a hot take about AI agents",
  "Write a thread hook about productivity",
  "Write a poll question about remote work",
  "Suggest 5 tweet ideas about {niche}",
]);
XActions.export(); // Download all responses
```

### Image generation workflow
1. `XActions.generateImage("Professional headshot, tech founder, minimalist")`
2. Wait for generation (10-30 seconds)
3. Right-click generated image to save
4. Use as profile picture, header, or tweet media

## Requirements
- X Premium or Premium+ subscription
- Grok access varies by region and account tier
- Image generation requires Premium+ in most regions
- Rate limits: ~20 prompts/hour for chat, ~5 images/hour

## MCP Alternative

For programmatic AI content without Grok, the XActions MCP server includes AI tools powered by OpenRouter:

| MCP Tool | Purpose |
|----------|---------|
| `x_analyze_voice` | Analyze account's writing style |
| `x_generate_tweet` | Generate tweet in user's voice |
| `x_rewrite_tweet` | Rewrite tweet for better engagement |
| `x_summarize_thread` | Summarize a thread |

These require an `OPENROUTER_API_KEY` env var but work without Premium.

## Notes
- Grok responses are AI-generated and should be reviewed before posting
- Grok has real-time X data access -- can reference current trends
- Image generation creates original images (not screenshots/existing images)
- Conversation context is maintained within a chat session

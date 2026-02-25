---
name: grok-ai
description: Interacts with X/Twitter's Grok AI chatbot — sends text prompts, generates images, summarizes topics and threads, and analyzes post performance predictions. Requires X Premium. Use when users want to automate Grok conversations, generate AI images, or get AI-powered content analysis.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Grok AI Integration

Browser automation for interacting with X's Grok AI chatbot — prompts, image generation, summarization, and post analysis.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Send prompts to Grok | `src/grokIntegration.js` | `x.com/i/grok` |
| Generate images with Grok | `src/grokIntegration.js` | `x.com/i/grok` |
| Summarize a topic or thread | `src/grokIntegration.js` | `x.com/i/grok` |
| Analyze a post's engagement potential | `src/grokIntegration.js` | `x.com/i/grok` |

## Grok Integration

**File:** `src/grokIntegration.js`

Puppeteer-based module for programmatic Grok AI interactions.

### Functions

| Function | Purpose |
|----------|---------|
| `queryGrok(page, query, { newChat?, waitTime? })` | Send a text prompt and extract the response |
| `generateImage(page, prompt)` | Generate an AI image (Premium+ may be required) |
| `summarize(page, topicOrUrl)` | Summarize a topic or thread URL |
| `analyzePost(page, postText)` | Rate a post 1–10 and get improvement suggestions |

### queryGrok

Navigates to `x.com/i/grok`, optionally starts a new chat, types the query, sends it, waits for the response to complete, and extracts the response text.

**Options:**
- `newChat: true` — start a fresh conversation (default: true)
- `waitTime: 15000` — milliseconds to wait for response (default: 15s)

### generateImage

Sends an image generation prompt to Grok and waits up to 20s for the image to render. Extracts the image URL if available.

### summarize

Accepts a topic string or URL. If URL, asks Grok to summarize the thread/post. If text, asks for a summary of the latest discussion on that topic. Uses Grok's real-time X data access.

### analyzePost

Sends a post's text to Grok and asks for a 1–10 engagement rating with improvement suggestions.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Chat input | `[data-testid="grokInput"]` |
| Send button | `[data-testid="grokSendButton"]` |
| Response area | `[data-testid="grokResponse"]` |
| Response text | `[data-testid="grokResponseText"]` |
| New chat | `[data-testid="grokNewChat"]` |
| Image gen toggle | `[data-testid="grokImageGen"]` |

## Prerequisites

- **Grok access:** Requires X Premium subscription
- **Image generation:** May require Premium+; daily limits (~10–25 images/day)

## Rate Limiting

- 5s built-in wait between queued prompts
- 15s default wait for text responses, 20s for image generation
- Grok may limit requests per hour during high traffic

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Grok not responding | Check X Premium subscription status |
| Response not captured | Increase `waitTime` — Grok may still be streaming |
| Image generation fails | Daily limit may be hit — try again tomorrow |
| "Grok is at capacity" | High traffic — retry in a few minutes |
| Input field not found | Grok UI may have updated — inspect for new selectors |

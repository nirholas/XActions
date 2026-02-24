# 🤖 Grok AI Integration

Interact with Grok AI on X/Twitter — summarize content, generate images, analyze posts, and get real-time insights.

## 📋 What It Does

1. Queries Grok AI from x.com/i/grok
2. Extracts and exports Grok responses
3. Summarizes trending topics automatically
4. Analyzes post sentiment and engagement potential

## 🌐 Browser Console Script

```javascript
// Go to: x.com/i/grok
// Paste scripts/grokIntegration.js
```

### Quick Grok Query

```javascript
// Navigate to x.com/i/grok, then:
const input = document.querySelector('textarea, [contenteditable][role="textbox"]');
input.focus();
document.execCommand('insertText', false, 'Summarize top tech trends on X today');
document.querySelector('button[aria-label="Send"]')?.click();
```

## 📦 Node.js Module

```javascript
import { queryGrok, summarize, analyzePost } from 'xactions';

// Query Grok (requires active x.com session)
const response = await queryGrok(page, 'What are people saying about AI on X?');

// Summarize a topic
const summary = await summarize(page, 'machine learning');

// Analyze a specific post
const analysis = await analyzePost(page, 'https://x.com/user/status/123');
```

## 🔧 MCP Server

```
Tool: x_grok_query
Input: { "query": "Top trends today", "mode": "default" }

Tool: x_grok_summarize
Input: { "topic": "AI agents" }
```

## ⚠️ Notes

- Grok access requires Premium or Premium+ subscription
- SuperGrok ($60/mo) provides extended context and priority access
- Grok 3 (Feb 2025+) supports image generation and real-time X data
- DeepSearch mode (2025+) does multi-step reasoning with web search
- Rate limits may apply during peak usage
- Grok responses may vary — always verify important information

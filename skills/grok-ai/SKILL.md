---
name: grok-ai
description: Interacts with X/Twitter's Grok AI chatbot from the browser. Sends prompts, generates images, and manages chat sessions. Use when users want to automate Grok AI interactions or integrate Grok into workflows.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Grok AI Integration

Browser console script for interacting with X's built-in Grok AI chatbot.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Grok Integration | `src/grokIntegration.js` | Send prompts, generate images, manage Grok chats |

## Grok Integration

**File:** `src/grokIntegration.js`

Automates interactions with Grok AI through the X interface.

### How to use

1. Navigate to `x.com/i/grok`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Chat input | `[data-testid="grokInput"]` |
| Send button | `[data-testid="grokSendButton"]` |
| Response area | `[data-testid="grokResponse"]` |
| New chat | `[data-testid="grokNewChat"]` |
| Image gen | `[data-testid="grokImageGen"]` |

## Notes

- Grok requires X Premium subscription
- Image generation may have daily limits
- Responses can take several seconds — script waits for completion
- Grok has access to real-time X data for context

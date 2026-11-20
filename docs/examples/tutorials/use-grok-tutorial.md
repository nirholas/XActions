---
title: "Use Grok AI — Tutorial"
description: "Chat with Grok AI, generate images, analyze posts, and summarize topics on X/Twitter using XActions automation."
keywords: ["grok ai twitter", "x grok integration", "grok image generation", "grok post analysis", "xactions grok"]
canonical: "https://xactions.app/examples/use-grok"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Use Grok AI — Tutorial

> Step-by-step guide to chatting with Grok AI, generating images, analyzing posts, and summarizing topics using XActions.

**Works on:** Node.js (Puppeteer)
**Difficulty:** Intermediate
**Time:** 5-10 minutes per query
**Requirements:** X Premium subscription (for Grok access), Node.js 18+

---

## Prerequisites

- Logged into x.com in your browser
- X Premium subscription (Grok access varies by tier)
- For Node.js: `npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth`
- Browser DevTools console for quick queries

---

## Quick Start

1. Navigate to `x.com/i/grok` in your browser
2. Open DevTools Console (F12, then click the **Console** tab)
3. Use the browser snippet to send a quick query, or use the Node.js module for automation
4. Wait for Grok to respond (typically 5-15 seconds)
5. View the response in the console

---

## Configuration

The Node.js module (`src/grokIntegration.js`) provides four main functions:

| Function | Description | Tier Required |
|----------|-------------|---------------|
| `queryGrok(page, query, options)` | Send a text query to Grok | Premium or higher |
| `generateImage(page, prompt)` | Generate an image from a text prompt | Premium+ |
| `summarize(page, topic)` | Summarize a topic or thread | Premium or higher |
| `analyzePost(page, postText)` | Analyze a post's engagement potential | Premium or higher |

Options for `queryGrok`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `newChat` | boolean | `true` | Start a new conversation |
| `waitTime` | number | `15000` | Milliseconds to wait for Grok's response |

---

## Step-by-Step Guide

### Method 1: Browser Console (Quick Query)

Navigate to `x.com/i/grok` first, then paste:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🤖 GROK AI - XActions by nichxbt');

  const query = 'What are the top trending topics on X right now?';

  // Type query into Grok input
  const chatInput = document.querySelector('[data-testid="grokInput"]')
    || document.querySelector('textarea')
    || document.querySelector('[contenteditable="true"]');

  if (!chatInput) {
    console.error('❌ Grok input not found. Make sure you are on x.com/i/grok');
    return;
  }

  chatInput.focus();
  document.execCommand('insertText', false, query);
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(500);

  // Click send
  const sendBtn = document.querySelector('[data-testid="grokSendButton"]')
    || document.querySelector('button[aria-label="Send"]')
    || document.querySelector('button[type="submit"]');

  if (sendBtn) {
    sendBtn.click();
    console.log(`📤 Sent query: "${query}"`);
    console.log('⏳ Waiting for response...');

    await sleep(15000);

    // Extract response
    const responses = document.querySelectorAll('[data-testid="grokResponseText"], [data-testid="grokResponse"]');
    if (responses.length > 0) {
      const lastResponse = responses[responses.length - 1];
      console.log('📥 Grok response:');
      console.log(lastResponse.textContent.trim());
    } else {
      console.log('⚠️ Response not found in expected elements. Check the Grok chat interface.');
    }
  } else {
    console.error('❌ Send button not found');
  }
})();
```

### Method 2: Node.js (Full Automation)

**Script:** `src/grokIntegration.js`

#### Chat with Grok

```javascript
import { queryGrok } from './src/grokIntegration.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

// Set your session cookie
await page.setCookie({
  name: 'auth_token',
  value: 'YOUR_AUTH_TOKEN',
  domain: '.x.com',
});

// Send a query
const result = await queryGrok(page, 'Explain the latest developments in AI');
console.log(result);
// {
//   success: true,
//   query: 'Explain the latest developments in AI',
//   response: 'Here are the latest developments in AI...',
//   timestamp: '2026-03-30T...'
// }

await browser.close();
```

#### Generate an Image (Premium+ Required)

```javascript
import { generateImage } from './src/grokIntegration.js';

// ... browser setup ...

const result = await generateImage(page, 'A futuristic city skyline at sunset with flying cars');
console.log(result);
// {
//   success: true,
//   prompt: 'A futuristic city skyline at sunset with flying cars',
//   imageUrl: 'https://...',
//   alt: 'Generated image',
//   timestamp: '2026-03-30T...'
// }
```

#### Summarize a Topic or Thread

```javascript
import { summarize } from './src/grokIntegration.js';

// Summarize by topic
const topicSummary = await summarize(page, 'artificial intelligence regulation');
console.log(topicSummary.response);

// Summarize a specific thread
const threadSummary = await summarize(page, 'https://x.com/user/status/1234567890');
console.log(threadSummary.response);
```

#### Analyze a Post's Engagement Potential

```javascript
import { analyzePost } from './src/grokIntegration.js';

const analysis = await analyzePost(page,
  'Just shipped a new feature that lets you automate your entire X workflow with a single command. Thread below on how it works.'
);

console.log(analysis.response);
// Grok will rate 1-10 and suggest improvements
```

### Grok Access by Tier

| Tier | Grok Access | Image Generation | Queries/Day |
|------|-------------|------------------|-------------|
| Free | Basic (limited) | No | ~10 |
| Basic ($3/mo) | More queries | No | ~30 |
| Premium ($8/mo) | Higher access | No | ~100 |
| Premium+ ($16/mo) | Highest | Yes | Unlimited |
| SuperGrok ($60/mo) | Unlimited | Yes | Unlimited |

---

## Tips & Tricks

1. **Wait time matters** -- Grok can take 5-20 seconds to generate a response. If you get empty responses, increase the `waitTime` option to 20000 or higher.

2. **Start new chats** -- Set `newChat: true` (default) to avoid context bleed from previous conversations.

3. **Image generation tips** -- Be descriptive in your prompts. Include style, mood, colors, and composition details. Image generation requires Premium+.

4. **Post analysis workflow** -- Use `analyzePost` before publishing important tweets. Grok can suggest improvements for better engagement.

5. **Summarize threads** -- Pass a full thread URL to `summarize()` to get a concise summary of long tweet threads.

6. **Navigate directly** -- You can always access Grok at `x.com/i/grok` or through the Grok icon in the X sidebar.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Grok input not found" | Navigate to `x.com/i/grok` before running the script. Grok has its own dedicated interface. |
| Empty response | Increase `waitTime` to 20000ms or more. Grok may take longer for complex queries. |
| Image generation failed | Image generation requires Premium+ ($16/mo). Check your subscription tier. |
| "No response received" | Grok may be experiencing high traffic. Wait a moment and try again. |
| Premium required message | Grok features require an active X Premium subscription. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| View Analytics | `browser/viewAnalytics.js` | View post performance metrics |
| Auto Commenter | `src/autoCommenter.js` | Generate and post automated replies |
| Algorithm Builder | `src/automation/algorithmBuilder.js` | Train the X algorithm for your niche |
| Persona Engine | `src/personaEngine.js` | AI-powered content strategy |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>

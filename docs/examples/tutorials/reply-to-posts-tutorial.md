# Reply to Posts -- Tutorial

> Step-by-step guide to replying to posts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com/home` or any search page
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `browser/autoReply.js`
4. Edit the `CONFIG` section (triggers, delays, dryRun)
5. Paste into the console and press Enter

## Configuration

The `CONFIG` object at the top of `browser/autoReply.js` controls all behavior:

### Trigger/Reply Pairs

```js
triggers: [
  {
    keywords: ['xactions', 'twitter automation'],
    reply: 'Check out XActions -- the complete X automation toolkit!',
  },
  {
    keywords: ['open source tools'],
    reply: 'Have you tried XActions? Great open source project.',
  },
],
```

Each trigger has an array of `keywords` (any match activates it) and a `reply` text that gets posted.

### Targeting Options

| Option | Default | Description |
|--------|---------|-------------|
| `minLikes` | `0` | Only reply to tweets with at least N likes |
| `maxLikes` | `Infinity` | Skip viral tweets (too noisy) |
| `ignoreVerified` | `false` | Skip verified/blue-check accounts |
| `ignoreReplies` | `true` | Only reply to original tweets, not replies |
| `fromUsers` | `[]` | Only reply to these usernames (empty = any) |
| `ignoreUsers` | `[]` | Never reply to these usernames |

### Limits and Safety

| Option | Default | Description |
|--------|---------|-------------|
| `maxReplies` | `10` | Maximum replies per session |
| `scrollCycles` | `20` | How far to scroll looking for matches |
| `minDelay` | `30000` | Minimum 30s between replies (critical for safety) |
| `maxDelay` | `60000` | Maximum 60s between replies |
| `dryRun` | `true` | Preview mode -- no replies are sent |
| `addRandomEmoji` | `true` | Appends a random emoji for variation |

## Step-by-Step Guide

### Manual Reply (No Script)

To reply to a single post manually via the console:

```js
// Click the reply button on the first visible tweet
document.querySelector('article[data-testid="tweet"] [data-testid="reply"]').click();
```

After the reply dialog opens, type your reply and click send.

### Automated Replies with autoReply.js

**Step 1: Start with a Dry Run**

Always start with `dryRun: true` (the default). This logs what the script *would* do without posting anything.

```js
const CONFIG = {
  triggers: [
    {
      keywords: ['AI agents', 'LLM tools'],
      reply: 'Great point! AI agents are changing everything.',
    },
  ],
  maxReplies: 5,
  dryRun: true,  // Preview only
};
```

**Step 2: Review Dry Run Output**

The console will show messages like:

```
[DRY] Would reply to @someuser: "Just discovered this amazing AI agent..."
  Reply: "Great point! AI agents are changing everything. [emoji]"
```

**Step 3: Go Live**

Once you are satisfied with the dry run results, change `dryRun` to `false`:

```js
dryRun: false,
```

Re-paste the script. The script will now actually post replies.

**Step 4: Monitor Progress**

The script logs each reply:

```
#1 Replied to @someuser: "Great point! AI agents are..."
```

And shows a summary when done:

```
Replied: 5
Time: 312s
Total tracked: 5
```

### Targeting Specific Users

To only reply to tweets from certain accounts:

```js
fromUsers: ['nichxbt', 'openai'],
ignoreUsers: ['spambot123'],
```

### Engagement-Based Targeting

To only reply to tweets with some traction but skip viral ones:

```js
minLikes: 5,
maxLikes: 1000,
```

## Tips & Tricks

- **Always start with `dryRun: true`** to preview before posting real replies.
- **Keep delays high** (30-60 seconds minimum). Rapid replies trigger spam detection.
- **Vary your reply text** by adding multiple trigger/reply pairs. Identical replies get flagged.
- **The `addRandomEmoji` option** appends a random emoji to each reply for natural variation.
- **Reply tracking** is stored in `localStorage` under `xactions_autoreplied`, so the script skips tweets it already replied to across sessions.
- **Navigate to a search page** like `x.com/search?q=AI+agents` to target specific topics instead of your home timeline.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Script says "Rate-limited" | Wait 2 minutes, then try again. Increase `minDelay`. |
| Reply textbox not found | X may have updated its UI. Check `data-testid` selectors. |
| Send button not found | The compose dialog may not have opened. Increase delays. |
| No matching tweets found | Broaden your keywords or increase `scrollCycles`. |
| Replies look spammy | Add more trigger/reply pairs. Enable `addRandomEmoji`. |

## Related Scripts

- `browser/likePost.js` -- Like posts by URL or keyword
- `browser/quoteTweetAutomation.js` -- Quote tweet with commentary
- `browser/mentionUsers.js` -- Mention multiple users in a post
- `src/automation/autoLiker.js` -- Auto-like posts (requires core.js)

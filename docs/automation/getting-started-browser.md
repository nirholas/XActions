# Getting Started with Browser Automation

> A step-by-step tutorial to run your first XActions automation in the browser console.

---

## Prerequisites

- A web browser (Chrome recommended)
- An X/Twitter account (logged in at x.com)
- Basic comfort with browser Developer Tools

---

## Step 1: Open Developer Tools

1. Navigate to [x.com](https://x.com) and log in
2. Open Developer Tools:
   - **Windows/Linux:** Press `F12` or `Ctrl+Shift+I`
   - **Mac:** Press `Cmd+Option+I`
3. Click the **Console** tab

You'll see the browser console — this is where you paste scripts.

> **First time?** Chrome may ask you to type "allow pasting". Do that first.

---

## Step 2: Load the Core Module

Copy the entire contents of [`src/automation/core.js`](../../src/automation/core.js) and paste into the console. Press Enter.

You should see:

```
✅ XActions Core loaded! Ready for automation scripts.
```

### Verify It Works

```javascript
// Test logging
window.XActions.Core.log('Hello from XActions!', 'success');
// Output: ✅ [12:34:56] Hello from XActions!

// Test async utility
await window.XActions.Core.sleep(1000);
console.log('Slept for 1 second');

// Check available selectors
console.log(window.XActions.Core.SELECTORS);
```

---

## Step 3: Run Your First Automation

### Example: Like 10 Posts About AI

1. Make sure you're on your X home feed
2. Open [`src/automation/autoLiker.js`](../../src/automation/autoLiker.js)
3. **Before pasting**, edit the OPTIONS section:

```javascript
const OPTIONS = {
  LIKE_ALL: false,
  KEYWORDS: ['AI', 'machine learning', 'LLM'],  // ← Your interests
  FROM_USERS: [],
  MAX_LIKES: 10,                                  // ← Start small
  MAX_SCROLL_DEPTH: 20,
  ALSO_RETWEET: false,
  MIN_DELAY: 2000,
  MAX_DELAY: 5000,
  SKIP_REPLIES: true,
  SKIP_ADS: true,
  MIN_LIKES_ON_POST: 0,
};
```

4. Paste the edited script into the console
5. Watch it scroll and like matching posts
6. When done, you'll see: `✅ Done! Liked 10 tweets.`

### To Stop Early

```javascript
window.stopAutoLiker();
```

Or just refresh the page.

---

## Step 4: Understanding the Output

XActions uses emoji-prefixed logs:

| Emoji | Meaning |
|-------|---------|
| 📘 | Information |
| ✅ | Success |
| ⚠️ | Warning |
| ❌ | Error |
| 🔧 | Action being performed |

Example output:
```
📘 [12:34:56] 🚀 Starting Auto-Liker...
📘 [12:34:56] Keywords: AI, machine learning, LLM
📘 [12:34:56] Max likes: 10
📘 [12:35:02] Found matching tweet: "The future of AI agents is..."
✅ [12:35:03] Liked tweet #1
📘 [12:35:08] Found matching tweet: "New LLM benchmark shows..."
✅ [12:35:09] Liked tweet #2
📘 [12:35:15] Progress: 2 likes, scrolled 3x
```

---

## Step 5: Check Stored Data

After running automations, data persists in localStorage:

```javascript
// See all XActions data
Object.keys(localStorage)
  .filter(k => k.startsWith('xactions_'))
  .forEach(k => console.log(k, JSON.parse(localStorage.getItem(k))));

// Check specific data
window.XActions.Core.storage.get('liked_tweets');
window.XActions.Core.storage.get('followed_users');
```

---

## Common Workflows

### Beginner: Like + Follow in Your Niche

```
1. Paste core.js
2. Be on your home feed
3. Paste autoLiker.js (configured with your keywords)
   → Likes 20 matching posts
```

### Intermediate: Search & Follow

```
1. Paste core.js
2. Be on any page
3. Paste keywordFollow.js (configured with niche terms)
   → Searches for users, follows matching ones
```

### Advanced: Full Growth Cycle

```
Week 1: core.js + keywordFollow.js → Follow 20 users/day
Week 2: core.js + autoLiker.js → Engage with feed
Week 3: core.js + smartUnfollow.js → Clean up non-followers
```

---

## Safety Checklist

Before running any script:

- [ ] **Start with small limits** — `MAX_LIKES: 10`, `MAX_FOLLOWS: 5`
- [ ] **Use DRY_RUN mode** when available (smartUnfollow has this)
- [ ] **Keep delays high** — 2-5 seconds between actions minimum
- [ ] **Don't run multiple action scripts simultaneously** — one at a time
- [ ] **Monitor the console** for warnings or errors
- [ ] **Refresh to stop** — all scripts halt on page refresh

### Rate Limit Guidelines

X enforces aggressive rate limits. Recommended safe maximums:

| Action | Per Hour | Per Day |
|--------|----------|---------|
| Likes | 50 | 200 |
| Follows | 30 | 100 |
| Unfollows | 40 | 100 |
| Comments | 10 | 50 |
| DMs | 20 | 100 |

---

## Troubleshooting

### "❌ Core module not loaded!"

You forgot to paste core.js first. Always paste core.js before any other script.

### "Could not find tweet textarea"

The compose dialog didn't open. Try refreshing and ensuring you're on x.com (not a different tab).

### Script seems to do nothing

1. Check the console for errors
2. Make sure you're on the right page (e.g., autoLiker needs a feed with tweets)
3. Verify keywords match content on the page
4. Try with `LIKE_ALL: true` or empty keywords to test

### Actions are being denied

You may be rate-limited. Wait an hour and try again with smaller limits.

### "Cannot read properties of null"

A DOM element wasn't found. X may have updated their UI. Check [dom-selectors.md](../dom-selectors.md) for current selectors.

---

## Next Steps

- **Learn the full API:** Load [actions.js](../../src/automation/actions.js) for 100+ functions — see [Actions Reference](actions-reference.md)
- **Use the control panel:** Load [controlPanel.js](../../src/automation/controlPanel.js) for a visual UI — see [Scripts Reference](scripts-reference.md#controlpaneljs--floating-control-panel)
- **Chain scripts:** See [Advanced Techniques](advanced-techniques.md) for multi-script workflows
- **Deep dive into Core:** See [Core Reference](core-reference.md) for every utility function

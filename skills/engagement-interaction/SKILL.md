---
name: engagement-interaction
description: Automates X/Twitter engagement actions including liking, replying, and managing interactions. Handles bulk engagement operations and engagement tracking. Use when users want to automate likes, replies, or manage engagement on tweets.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Engagement & Interaction

Browser console script for automating engagement actions on X/Twitter.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Engagement Manager | `src/engagementManager.js` | Bulk like, reply, and manage engagement |
| Unlike All Posts | `src/unlikeAllPosts.js` | Remove all likes from your account |

## Engagement Manager

**File:** `src/engagementManager.js`

Automates engagement actions: bulk liking, replying, and tracking interactions.

### How to use

1. Navigate to a timeline, search results, or profile page
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Unlike All Posts

**File:** `src/unlikeAllPosts.js`

Removes all likes from your account by scrolling through your likes page.

1. Navigate to `x.com/YOUR_USERNAME/likes`
2. Paste in DevTools console → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Like button | `[data-testid="like"]` |
| Unlike button | `[data-testid="unlike"]` |
| Reply button | `[data-testid="reply"]` |
| Reply input | `[data-testid="tweetTextarea_0"]` |
| Reply submit | `[data-testid="tweetButton"]` |
| Share button | `[data-testid="share"]` |
| Engagements count | `[data-testid="engagements"]` |
| Hide reply | `[data-testid="hideReply"]` |

## Notes

- Unlike All Posts is irreversible — likes cannot be restored
- Add 1-2s delays between engagement actions to avoid rate limits
- Engagement scripts work on any page with tweets (timeline, search, profile)

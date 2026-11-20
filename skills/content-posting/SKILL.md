---
name: content-posting
description: Create and publish content on X/Twitter programmatically. Post threads, schedule posts, create polls, auto-repost by keyword, compose threads with preview, quote-tweet with templates, repurpose content, and auto-plug replies on viral tweets. Use when automating content creation, scheduling, thread building, or content repurposing.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "4.0"
---

# Content Posting

Browser console scripts for automating content creation and publishing on X/Twitter.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Post a thread | `browser/postThread.js` | `x.com` |
| Schedule posts | `browser/schedulePosts.js` | `x.com` |
| Create a poll | `browser/createPoll.js` | `x.com` |
| Auto-repost by keyword | `browser/autoRepost.js` | Timeline or search |
| Compose + preview threads | `browser/threadComposer.js` | `x.com/USERNAME` |
| Quote-tweet with templates | `browser/quoteTweetAutomation.js` | Timeline |
| Repurpose tweets | `browser/contentRepurposer.js` | `x.com/USERNAME` |
| Auto-plug viral tweets | `browser/autoPlugReplies.js` | `x.com/USERNAME` |
| Content calendar analysis | `browser/contentCalendar.js` | `x.com/USERNAME` |
| Optimize posting times | `browser/tweetScheduleOptimizer.js` | `x.com/USERNAME` |

## Script Details

### threadComposer.js
Interactive thread creation with draft persistence. Compose parts, preview, reorder, and publish.

**Controls:** `XActions.create(topic, points)`, `XActions.preview()`, `XActions.post()`, `XActions.export()`

### contentRepurposer.js
Converts existing tweets into new formats: threads, tweet storms, blog outlines, summary variations, and quote-tweet templates. Scan your timeline, pick top tweets, generate 5 content variations per tweet.

**Controls:** `XActions.scan()`, `XActions.list()`, `XActions.toThread(i)`, `XActions.toSummary(i)`, `XActions.toStorm(i)`, `XActions.toBlog(i)`, `XActions.toQuoteTemplates(i)`, `XActions.all(i)`

### autoPlugReplies.js
Auto-replies to your own viral tweets with a promotional plug. Configurable viral threshold, dry-run mode, session limits.

**Controls:** `XActions.setPlug(text)`, `XActions.scan()`, `XActions.autoScan(ms)`, `XActions.stop()`

### quoteTweetAutomation.js
Auto quote-tweets matching tweets with customizable templates and engagement filters.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Compose button | `a[data-testid="SideNav_NewTweet_Button"]` |
| Tweet text area | `[data-testid="tweetTextarea_0"]` |
| Post button | `[data-testid="tweetButton"]` |
| Media input | `[data-testid="fileInput"]` |
| Poll button | `[aria-label="Add poll"]` |
| Schedule | `[data-testid="scheduleOption"]` |
| Thread add | `[data-testid="addButton"]` |
| Reply button | `[data-testid="reply"]` |

## Content Strategy

### Maximizing content output
1. `browser/tweetPerformance.js` -- identify your best-performing content
2. `browser/contentRepurposer.js` -- generate 5 variations per top tweet
3. `browser/tweetScheduleOptimizer.js` -- schedule content at optimal times
4. `browser/autoPlugReplies.js` -- automatically promote on viral tweets
5. `browser/contentCalendar.js` -- identify posting gaps to fill

### Thread workflow
1. Use `browser/contentRepurposer.js` -> `XActions.toThread(i)` for thread outlines
2. Edit and refine with `browser/threadComposer.js`
3. Preview with `XActions.preview()`
4. Post with `XActions.post()`

## Notes
- All posting scripts include dry-run mode by default
- Thread tweets validated for character count before posting
- Free: 280 chars. Premium: 25,000+ chars, scheduling, edit
- Auto-repost includes safety filters (min likes, skip replies)
- Add 1-3s delays between actions to avoid rate limiting

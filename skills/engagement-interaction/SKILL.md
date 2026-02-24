---
name: engagement-interaction
description: Automate X/Twitter engagement including likes, replies, bookmarks, mentions, hashtags, reactions, sharing, analytics, reply limits, hidden replies, and video reactions. Manage engagement at scale with rate limiting and smart targeting.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Engagement & Interaction with XActions

Manage and automate all forms of X/Twitter engagement.

## Features

- **Likes**: Auto-like posts by keyword, user, or hashtag
- **Replies/Comments**: Automated threaded responses with text/media
- **Bookmarks**: Save posts privately, organize in folders (Premium)
- **Mentions (@)**: Tag users in posts and replies
- **Hashtags (#)**: Categorize content (recommended limit: 2)
- **Reactions**: Emoji reactions (expanding feature)
- **Sharing**: Share via links, DMs, or externally
- **Analytics**: View impressions and engagements (Premium)
- **Reply Limits**: Restrict who can reply (everyone, followers, mentioned)
- **Hide Replies**: Conceal unwanted comments
- **Video Reactions**: Short video reply feature
- **Boost/Promote**: Amplify posts via Ads
- **Paid Promotion Label**: Sponsored post disclosure (2026)

## Browser Console Scripts

### Auto Liker
**File:** `scripts/autoEngage.js`

### Key selectors

| Element | Selector |
|---------|----------|
| Like button | `[data-testid="like"]` |
| Unlike button | `[data-testid="unlike"]` |
| Reply button | `[data-testid="reply"]` |
| Retweet button | `[data-testid="retweet"]` |
| Bookmark button | `[data-testid="bookmark"]` |
| Share button | `[data-testid="share"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| Reply input | `[data-testid="tweetTextarea_0"]` |
| Reply submit | `[data-testid="tweetButton"]` |
| Hide reply | `[data-testid="hideReply"]` |

## MCP Tools

- `x_like` – Like a tweet
- `x_unlike` – Unlike a tweet
- `x_reply` – Reply to a tweet
- `x_bookmark` – Bookmark a tweet
- `x_unbookmark` – Remove bookmark
- `x_hide_reply` – Hide a reply
- `x_set_reply_limit` – Set who can reply
- `x_get_engagement` – Get engagement analytics

## API Endpoints

- `POST /api/engagement/like` – Like a post
- `POST /api/engagement/reply` – Reply to a post
- `POST /api/engagement/bookmark` – Bookmark a post
- `DELETE /api/engagement/bookmark/:id` – Remove bookmark
- `POST /api/engagement/hide-reply` – Hide a reply
- `PUT /api/engagement/reply-limit` – Set reply restrictions
- `GET /api/engagement/analytics/:postId` – Get post analytics

## Related Files

- `src/engagementManager.js` – Core engagement module
- `src/automation/autoLiker.js` – Auto-liker
- `src/automation/autoCommenter.js` – Auto-commenter
- `src/clearAllBookmarks.js` – Clear all bookmarks
- `scripts/autoEngage.js` – Browser engagement script
- `scripts/scrapeBookmarks.js` – Export bookmarks

## Notes

- Rate limit: ~500 likes/day, ~100 replies/day
- Use 1-3 second delays between actions
- Premium accounts get higher organic reach
- Bookmark folders require Premium
- Analytics require Premium

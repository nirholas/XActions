---
name: content-posting
description: Create and publish content on X/Twitter programmatically. Post threads, schedule posts, create polls, auto-repost tweets by keyword/user filters. Use when users want to automate content creation, schedule tweets, or build threads.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Content Posting with XActions

Browser console scripts for automating content creation and publishing on X/Twitter.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Post Thread | `src/postThread.js` | Compose and publish a multi-tweet thread |
| Schedule Posts | `src/schedulePosts.js` | Queue posts for future publishing (Premium) |
| Create Poll | `src/createPoll.js` | Create a poll tweet with 2-4 options |
| Auto Repost | `src/autoRepost.js` | Auto-retweet by keyword or user filters |
| Post Composer | `src/postComposer.js` | Core posting module for single tweets |
| Poll Creator | `src/pollCreator.js` | Alternative poll creation script |

## Script details

**Full CONFIG examples and per-script usage**: See [references/script-configs.md](references/script-configs.md)

## Key Selectors

| Element | Selector |
|---------|----------|
| Compose button | `a[data-testid="SideNav_NewTweet_Button"]` |
| Tweet text area | `[data-testid="tweetTextarea_0"]` |
| Post button | `[data-testid="tweetButton"]` |
| Media button | `[data-testid="fileInput"]` |
| Poll button | `[aria-label="Add poll"]` |
| Schedule button | `[data-testid="scheduleOption"]` |
| Thread add | `[data-testid="addButton"]` |
| Retweet button | `[data-testid="retweet"]` |
| Confirm retweet | `[data-testid="retweetConfirm"]` |
| Already retweeted | `[data-testid="unretweet"]` |
| Alt text | `[data-testid="altTextInput"]` |

## MCP Tools

- `x_post_tweet` – Post a new tweet
- `x_post_thread` – Post a multi-tweet thread
- `x_create_poll` – Create a poll with options
- `x_schedule_post` – Schedule a post for later
- `x_quote_post` – Quote retweet a post
- `x_repost` – Retweet/repost a post
- `x_edit_post` – Edit a recent post (Premium)
- `x_delete_post` – Delete a post

## Notes

- All posting scripts include dry-run mode by default
- Thread tweets are validated for character count before posting
- Free accounts: 280 char limit. Premium: 25,000+ chars, scheduling, edit
- Auto Repost includes safety filters (min likes, skip replies, skip sensitive)
- Add delays between actions to avoid rate limiting
- 2026 features: image polls, audio articles, shuffle choices in testing

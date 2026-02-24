```skill
---
name: posting-content
description: Create and manage X/Twitter posts including tweets, threads, polls, scheduled posts, articles, quote posts, reposts, and media attachments. Supports 2026 features like image polls, audio articles, shuffle choices, and Apple Intelligence writing tools.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Posting & Content Creation with XActions

Automate content creation on X/Twitter — from simple tweets to long-form articles.

## Features

- **Post/Tweet**: Text posts (280 chars free, 25,000+ Premium)
- **Threads**: Linked multi-post stories
- **Polls**: Votable questions with optional images (2026)
- **Schedule**: Plan posts for future publishing (Premium)
- **Quote Post**: Add commentary to shared posts
- **Repost/Retweet**: Share others' content
- **Media**: Images, videos (140s free, longer Premium), GIFs, carousels
- **Articles**: Long-form content with formatting (Premium+)
- **Audio Articles**: Embed voiceovers/podcasts (2026, testing)
- **Edit**: Modify posts within 1-hour window (Premium)
- **Bold/Italics**: Text formatting (Premium)
- **Alt Text**: Accessibility for images/videos
- **Community Notes**: Fact-check contributions
- **Shuffle Choices**: Randomize poll options (2026, in development)

## Browser Console Script

**File:** `scripts/postComposer.js`

### How to use

1. Navigate to `x.com/compose/tweet` or click the compose button
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Compose button | `a[data-testid="SideNav_NewTweet_Button"]` |
| Tweet text area | `[data-testid="tweetTextarea_0"]` |
| Post button | `[data-testid="tweetButton"]` |
| Media button | `[data-testid="fileInput"]` |
| Poll button | `[aria-label="Add poll"]` |
| Schedule button | `[data-testid="scheduleOption"]` |
| Thread add | `[data-testid="addButton"]` |
| GIF button | `[aria-label="Add a GIF"]` |
| Emoji button | `[aria-label="Add emoji"]` |
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
- `x_publish_article` – Publish long-form article (Premium+)

## API Endpoints

- `POST /api/posting/tweet` – Create a tweet
- `POST /api/posting/thread` – Post a thread
- `POST /api/posting/poll` – Create a poll
- `POST /api/posting/schedule` – Schedule a post
- `POST /api/posting/quote` – Quote a post
- `POST /api/posting/article` – Publish an article
- `PUT /api/posting/:id/edit` – Edit a post
- `DELETE /api/posting/:id` – Delete a post

## Related Files

- `src/postComposer.js` – Core posting module
- `src/postThread.js` – Thread posting
- `src/schedulePosts.js` – Post scheduling
- `src/articlePublisher.js` – Article publishing
- `scripts/postComposer.js` – Browser console script
- `scripts/pollCreator.js` – Poll creation script

## Notes

- Free accounts: 280 char limit, 140s video
- Premium: 25,000+ chars, longer video, scheduling, edit, formatting
- Premium+: Articles with embeds and audio
- Always add alt text for accessibility
- Thread limit: No hard cap, but engagement drops after ~10 tweets
- Polls: 2-4 choices, 5min-7day duration
```

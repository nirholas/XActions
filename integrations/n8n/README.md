# n8n-nodes-xactions

> XActions community node for [n8n](https://n8n.io) — automate X/Twitter, Bluesky, Mastodon & Threads from n8n workflows. No API fees.

## What is XActions?

[XActions](https://github.com/nirholas/XActions) is an open-source X/Twitter automation toolkit that uses browser automation instead of the Twitter API. This n8n community node brings all of XActions' capabilities into n8n's visual workflow builder.

## Nodes

### XActions (Action)

Perform actions like scraping, posting, engagement, analytics, and streaming.

| Resource | Operations |
|----------|-----------|
| **Profile** | Get Profile, Update Profile |
| **Tweets** | Get Tweets, Search, Thread, Hashtag, Likes, Media, Trending |
| **Followers** | Get Followers, Get Following, Non-Followers, Follow, Unfollow, Bulk Unfollow |
| **Engagement** | Like, Retweet, Reply, Auto-Like |
| **Analytics** | Analyze Sentiment, Monitor Reputation, Get Report |
| **Streaming** | Start/Stop/Pause/Resume Stream, List Streams, Event History |
| **Posting** | Post Tweet, Post Thread, Create Poll, Delete Tweet |
| **DMs** | Send DM, Get Conversations, Export DMs |
| **Bookmarks** | Get Bookmarks, Add Bookmark, Clear Bookmarks |

### XActions Trigger (Polling)

Start workflows when events happen:

- **New Tweet** — fires when a user posts a new tweet
- **Follower Change** — fires when someone follows or unfollows
- **New Mention** — fires when the username is mentioned
- **Sentiment Alert** — fires when sentiment drops below a threshold

## Multi-Platform Support

All scraping operations support:
- **Twitter/X** (default) — via Puppeteer browser automation
- **Bluesky** — via AT Protocol API
- **Mastodon** — via public REST API (any instance)
- **Threads** — via Puppeteer

## Execution Modes

### Local Mode (default)
XActions runs on the same machine as n8n. Puppeteer browsers launch locally. Free, no API server needed.

### Remote Mode
Connect to an XActions API server via HTTP. Ideal when n8n and XActions run on different machines. Set the API base URL and JWT token in credentials.

## Installation

### Community Nodes (recommended)

1. In n8n, go to **Settings → Community Nodes**
2. Search for `n8n-nodes-xactions`
3. Click **Install**

### Manual Install

```bash
# In your n8n installation directory
npm install n8n-nodes-xactions
```

### From Source (development)

```bash
cd integrations/n8n
npm install
npm run build

# Link into n8n's custom nodes directory
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-xactions
```

## Credentials Setup

1. In n8n, go to **Credentials → Add Credential → XActions API**
2. Choose mode:
   - **Local**: Set your X/Twitter auth cookie (`auth_token` from browser DevTools)
   - **Remote**: Set API base URL + JWT token
3. Optionally set default platform (Twitter, Bluesky, Mastodon, Threads)

### Getting your auth_token

1. Log into x.com in your browser
2. Open DevTools (F12) → Application → Cookies → `https://x.com`
3. Find the `auth_token` cookie and copy its value

## Example Workflows

### Monitor a user's tweets and analyze sentiment

```
[XActions Trigger: New Tweet from @elonmusk]
    → [XActions: Analyze Sentiment]
    → [IF: sentiment < -0.3]
    → [Slack: Send Alert]
```

### Auto-engage with industry content

```
[Schedule Trigger: Every 4 hours]
    → [XActions: Search Tweets "AI agents"]
    → [XActions: Analyze Sentiment (filter positive)]
    → [XActions: Like Tweet]
```

### Track follower changes to a spreadsheet

```
[XActions Trigger: Follower Change for @myaccount]
    → [IF: event = "new_follower"]
    → [Google Sheets: Append Row]
```

### Cross-platform content monitoring

```
[XActions Trigger: New Mention on Bluesky]
    → [XActions: Analyze Sentiment]
    → [Discord: Post to #social-alerts]
```

## Trigger Behavior

- On first activation, the trigger stores current state without emitting events (avoids flooding)
- Subsequent polls only emit **new** items via deduplication
- Follower changes emit separate events for each new/lost follower
- Sentiment alerts aggregate recent mentions and alert if average drops below threshold

## Rate Limits

XActions uses browser automation, so there are no API rate limits in the traditional sense. However:

- Keep polling intervals reasonable (60s+ for tweets, 120s+ for followers)
- Each poll opens a Puppeteer browser briefly — frequent polls use more CPU/RAM
- The browser pool shares max 3 browsers across all streams
- Consider using XActions' built-in streaming system for high-frequency monitoring

## License

MIT — same as XActions

## Links

- [XActions Repository](https://github.com/nirholas/XActions)
- [XActions Documentation](https://github.com/nirholas/XActions/tree/main/docs)
- [n8n Community](https://community.n8n.io)

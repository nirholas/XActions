# Video Generation

Generate promotional and content videos from X/Twitter data using [Remotion](https://remotion.dev). Create tweet videos, thread carousels, analytics dashboards, and promo clips — all rendered programmatically.

## Architecture

```
site/video/
├── remotion.config.js          # Remotion CLI configuration
└── src/
    ├── index.js                # Entry point
    ├── Root.jsx                # Registers all compositions
    ├── compositions/           # Video composition components
    ├── components/             # Shared React components
    └── utils/                  # Helper utilities
```

## Available Compositions

| ID | Component | Duration | Aspect Ratio | Description |
|----|-----------|----------|-------------|-------------|
| `TweetVideo` | `TweetVideo` | 5s (150 frames) | 9:16 (vertical) | Single tweet as video |
| `TweetVideo-Landscape` | `TweetVideo` | 5s | 16:9 | Landscape variant |
| `TweetVideo-Square` | `TweetVideo` | 5s | 1:1 | Square variant |
| `ThreadVideo` | `ThreadVideo` | 10s (300 frames) | 9:16 | Thread carousel video |
| `ThreadVideo-Landscape` | `ThreadVideo` | 10s | 16:9 | Landscape thread |
| `AnalyticsDashboard` | `AnalyticsDashboard` | 8s (240 frames) | 16:9 | Animated analytics |
| `PromoVideo` | `PromoVideo` | 15s (450 frames) | 16:9 | Promotional clip |
| `PromoVideo-Vertical` | `PromoVideo` | 15s | 9:16 | Vertical promo |

## Quick Start

### Prerequisites

```bash
npm install remotion @remotion/cli @remotion/player @remotion/renderer
```

### Preview in Browser

```bash
cd site/video
npx remotion studio
```

Opens `http://localhost:3000` with a live preview of all compositions.

### Render a Video

```bash
# Render a tweet video
npx remotion render TweetVideo out/tweet.mp4 \
  --props='{"tweetText":"Hello world!","username":"nichxbt","likes":42,"retweets":10}'

# Render a thread video
npx remotion render ThreadVideo out/thread.mp4 \
  --props='{"tweets":["Tweet 1","Tweet 2","Tweet 3"],"username":"nichxbt"}'

# Render analytics dashboard
npx remotion render AnalyticsDashboard out/analytics.mp4

# Render promo video (vertical for social)
npx remotion render PromoVideo-Vertical out/promo-vertical.mp4
```

### REST API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/video/extract` | Extract video URLs from a tweet |
| GET | `/api/video/download` | Proxy-download a video (CORS bypass) |
| POST | `/api/video/extract-form` | Extract video URLs (form-encoded) |

Rate limit: 30 requests/minute per IP. Results cached 1 hour.

### Extract video from a tweet

```bash
curl -X POST http://localhost:3001/api/video/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://x.com/user/status/123456"}'
```

## Composition Props

### TweetVideo

```javascript
{
  tweetText: "Your tweet content here",
  username: "nichxbt",
  displayName: "nich",
  likes: 42,
  retweets: 10,
  replies: 5,
  avatarUrl: "https://..."    // optional
}
```

### ThreadVideo

```javascript
{
  tweets: ["First tweet", "Second tweet", "Third tweet"],
  username: "nichxbt",
  displayName: "nich"
}
```

### AnalyticsDashboard

```javascript
{
  followers: 12500,
  followerGrowth: 150,
  engagementRate: 4.2,
  topTweet: { text: "...", likes: 500 },
  chartData: [/* time series */]
}
```

## Customization

Components in `site/video/src/components/` can be modified to change styling, animations, and branding. The Remotion framework uses standard React and CSS.

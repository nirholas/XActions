# 📡 Real-Time Event Streaming

Subscribe to live events from X/Twitter accounts. The system polls at configurable intervals and pushes diffs over Socket.IO.

## Stream Types

| Type | Event | Description |
|------|-------|-------------|
| `tweet` | `stream:tweet` | New tweets from a user |
| `follower` | `stream:follower` | Follow/unfollow events |
| `mention` | `stream:mention` | New mentions of a username |

## Quick Start

### CLI

```bash
# Start watching tweets from a user
xactions stream start tweet elonmusk --interval 60

# Watch follower changes
xactions stream start follower nichxbt --interval 120

# Watch mentions
xactions stream start mention nichxbt

# List active streams
xactions stream list

# Get detailed status of a stream
xactions stream status stream_tweet_elonmusk_a1b2c3d4

# View recent events (with optional type filter)
xactions stream history stream_tweet_elonmusk_a1b2c3d4
xactions stream history stream_tweet_elonmusk_a1b2c3d4 --type stream:tweet

# Pause / resume a stream
xactions stream pause stream_tweet_elonmusk_a1b2c3d4
xactions stream resume stream_tweet_elonmusk_a1b2c3d4

# Stop a single stream
xactions stream stop stream_tweet_elonmusk_a1b2c3d4

# Stop all streams at once
xactions stream stop-all
```

### REST API

```bash
# Create a stream
curl -X POST http://localhost:3001/api/streams \
  -H 'Content-Type: application/json' \
  -d '{"type": "tweet", "username": "elonmusk", "interval": 60}'

# List active streams
curl http://localhost:3001/api/streams

# Get aggregate stats
curl http://localhost:3001/api/streams/stats

# Get stream status
curl http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4

# Update poll interval
curl -X PATCH http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4 \
  -H 'Content-Type: application/json' \
  -d '{"interval": 90}'

# Pause / resume
curl -X POST http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4/pause
curl -X POST http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4/resume

# View event history (with optional type filter)
curl http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4/history?limit=20
curl http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4/history?type=stream:tweet

# Stop a stream
curl -X DELETE http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4

# Stop all streams
curl -X DELETE http://localhost:3001/api/streams
```

### Socket.IO (Real-Time)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token', role: 'dashboard' }
});

// Join a stream room to receive events
socket.emit('stream:join', 'stream_tweet_elonmusk_a1b2c3d4');

// Listen for new tweets
socket.on('stream:tweet', (event) => {
  console.log('New tweet:', event.data.text);
});

// Listen for follower changes
socket.on('stream:follower', (event) => {
  console.log(`${event.data.action}: @${event.data.follower}`);
});

// Listen for mentions
socket.on('stream:mention', (event) => {
  console.log('Mentioned by:', event.data.author);
});

// Leave room when done
socket.emit('stream:leave', 'stream_tweet_elonmusk_a1b2c3d4');
```

### MCP (AI Agent)

Available tools for Claude, Cursor, and other AI agents:

- **`x_stream_start`** — Start a stream (type, username, optional interval). Rejects duplicates.
- **`x_stream_stop`** — Stop a stream by ID
- **`x_stream_list`** — List all active streams with pool info
- **`x_stream_pause`** — Pause a stream (retains state, stops polling)
- **`x_stream_resume`** — Resume a paused stream
- **`x_stream_status`** — Detailed status of a single stream
- **`x_stream_history`** — Recent events (optional `eventType` filter)

## Architecture

```
┌───────────────┐     ┌──────────────┐     ┌───────────┐
│  REST API /   │     │ StreamManager│     │  Redis    │
│  CLI / MCP    │────▶│  (Bull jobs) │────▶│  State    │
└───────────────┘     └──────┬───────┘     └───────────┘
                             │ poll
                    ┌────────┼────────┐
                    ▼        ▼        ▼
              tweetStream  follower  mention
              (Puppeteer)  Stream    Stream
                    │        │        │
                    └────────┼────────┘
                             │ diffs
                    ┌────────▼────────┐
                    │   Socket.IO     │
                    │  stream rooms   │
                    └─────────────────┘
```

### Key Components

| File | Purpose |
|------|---------|
| `src/streaming/streamManager.js` | Central coordinator — create/stop/pause/resume, poll scheduling, concurrency guards |
| `src/streaming/tweetStream.js` | Polls user tweets, returns new ones |
| `src/streaming/followerStream.js` | Polls followers with fast-path count check, computes follow/unfollow diffs |
| `src/streaming/mentionStream.js` | Polls mentions via search |
| `src/streaming/browserPool.js` | Manages Puppeteer pool with auto-pruning, max-age recycling, health checks |
| `api/routes/streams.js` | REST endpoints (9 routes) |

### Reliability Features

- **Duplicate prevention**: Only one stream per type+username at a time (409 on duplicate)
- **Concurrency guard**: In-memory lock + Redis NX lock prevent overlapping polls
- **Auto-stop**: Streams auto-stop after 10 consecutive errors
- **Exponential backoff**: 1×, 2×, 4×, 8× the poll interval on errors, capped at 15 min
- **Browser recycling**: Browsers pruned after 30 min max-age, disconnected browsers auto-removed
- **Redis TTL**: All keys expire after 7 days to prevent stale data
- **Graceful restart**: `refreshFromRedis` re-registers Bull jobs for running streams on process restart

### Deduplication

- **Tweets/mentions**: last-seen tweet IDs stored in Redis (up to 500 per stream)
- **Followers**: full follower username list stored in Redis, diffed each poll
- **Fast-path**: follower stream checks profile count first — skips expensive scrape if unchanged

### Browser Pool

Configurable max browsers (`XACTIONS_MAX_BROWSERS` env var, default 3). Browsers are reused (up to 5 pages each). Auto-pruned when disconnected or older than 30 minutes. `acquireBrowser()` times out after 30 seconds if pool is full. Pool health is exposed via `GET /api/streams/stats` and `x_stream_list`.

## ⚠️ Notes

- Requires Redis for state persistence and Bull job scheduling
- Default poll interval is 60 seconds — lower intervals increase rate limit risk
- Minimum interval is 15 seconds, maximum is 3600 seconds
- Streams survive process restarts (state is persisted in Redis)
- Browser pool starts empty and grows on demand
- Set `XACTIONS_MAX_BROWSERS` to control pool size (default: 3)

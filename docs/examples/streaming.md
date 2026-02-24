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

# View recent events
xactions stream history stream_tweet_elonmusk_a1b2c3d4

# Stop a stream
xactions stream stop stream_tweet_elonmusk_a1b2c3d4
```

### REST API

```bash
# Create a stream
curl -X POST http://localhost:3001/api/streams \
  -H 'Content-Type: application/json' \
  -d '{"type": "tweet", "username": "elonmusk", "interval": 60}'

# List active streams
curl http://localhost:3001/api/streams

# Get stream status
curl http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4

# View event history
curl http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4/history?limit=20

# Stop a stream
curl -X DELETE http://localhost:3001/api/streams/stream_tweet_elonmusk_a1b2c3d4
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

- **`x_stream_start`** — Start a stream (type, username, optional interval)
- **`x_stream_stop`** — Stop a stream by ID
- **`x_stream_list`** — List all active streams with pool info

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
| `src/streaming/streamManager.js` | Central coordinator — create/stop/list streams, poll scheduling |
| `src/streaming/tweetStream.js` | Polls user tweets, returns new ones |
| `src/streaming/followerStream.js` | Polls followers, computes follow/unfollow diffs |
| `src/streaming/mentionStream.js` | Polls mentions via search |
| `src/streaming/browserPool.js` | Manages max 3 Puppeteer browsers, shared across streams |
| `api/routes/streams.js` | REST endpoints |

### Deduplication

- **Tweets/mentions**: last-seen tweet IDs stored in Redis (up to 500 per stream)
- **Followers**: full follower username list stored in Redis, diffed each poll

### Rate Limit Protection

Exponential backoff on errors: 1×, 2×, 4×, 8× the poll interval, capped at 15 minutes.
Stream status shows `backoff` state with `backoffUntil` timestamp.

### Browser Pool

Max 3 Puppeteer instances shared across all streams. Browsers are reused (up to 5 pages each).
Pool status is included in `GET /api/streams` and `x_stream_list`.

## ⚠️ Notes

- Requires Redis for state persistence and Bull job scheduling
- Default poll interval is 60 seconds — lower intervals increase rate limit risk
- Minimum interval is 15 seconds
- Streams survive process restarts (state is persisted in Redis)
- Browser pool starts empty and grows on demand

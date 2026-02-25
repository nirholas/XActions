# Real-time Streams — Live Twitter Monitoring

> Monitor tweets, followers, and mentions in real-time with persistent polling, deduplication, and live Socket.IO events.

## Overview

XActions Streams provides a real-time polling system that monitors X/Twitter accounts for changes:

- **Tweet Streams** — Watch for new tweets from any account
- **Follower Streams** — Get alerted when followers change (new followers, unfollowers)
- **Mention Streams** — Track mentions of any keyword or @username
- **Persistent** — Uses Bull queues (Redis-backed) to survive crashes and restarts
- **Deduplicated** — Redis-based dedup ensures events fire only once per new item
- **Live Events** — Pushes diffs over Socket.IO in real-time

Available via: **CLI**, **API**, **MCP tools** (for AI agents).

---

## Quick Start

### Start a stream (CLI)

```bash
# Monitor tweets from @nichxbt
unfollowx stream start tweet @nichxbt --auth-token YOUR_TOKEN

# Monitor followers of @nichxbt (check every 5 minutes)
unfollowx stream start follower @nichxbt --interval 300 --auth-token YOUR_TOKEN

# Monitor mentions of a keyword
unfollowx stream start mention "xactions" --auth-token YOUR_TOKEN
```

### Manage streams (CLI)

```bash
unfollowx stream list              # List active streams
unfollowx stream status <id>       # Check stream status
unfollowx stream pause <id>        # Pause a stream
unfollowx stream resume <id>       # Resume a paused stream
unfollowx stream stop <id>         # Stop a stream
unfollowx stream stop-all          # Stop all streams
unfollowx stream history <id>      # View event history
```

---

## Architecture

```
src/streaming/
├── streamManager.js    → Core orchestrator (create, stop, pause, resume, poll)
├── tweetStream.js      → Tweet polling logic
├── followerStream.js   → Follower diff detection
├── mentionStream.js    → Mention polling logic
├── browserPool.js      → Puppeteer browser pool (shared across streams)
└── index.js            → Barrel re-exports
```

### Polling Flow

```
createStream({ type, target, interval })
   ├─ Register with Bull queue (Redis)
   ├─ Schedule recurring poll every <interval> seconds
   └─ On each poll:
        ├─ Acquire browser from pool
        ├─ Scrape latest data
        ├─ Diff against previous state (Redis)
        ├─ Deduplicate via Redis SET
        ├─ Emit new items via Socket.IO
        └─ Save to event history
```

---

## Stream Types

| Type | What it monitors | Events emitted |
|------|-----------------|----------------|
| `tweet` | New tweets from a user | New tweet with text, ID, engagement |
| `follower` | Follower list changes | New followers, unfollowers |
| `mention` | Mentions of a keyword/user | New mentions with context |

---

## API Reference

### Start a stream

```http
POST /api/streams
Content-Type: application/json

{
  "type": "tweet",
  "target": "nichxbt",
  "interval": 60,
  "authToken": "your_auth_token"
}
```

### Manage streams

```http
GET    /api/streams              # List all streams
GET    /api/streams/:id          # Get stream status
POST   /api/streams/:id/pause    # Pause
POST   /api/streams/:id/resume   # Resume
DELETE /api/streams/:id          # Stop
DELETE /api/streams              # Stop all
GET    /api/streams/:id/history  # Event history
```

---

## MCP Tools (AI Agents)

| Tool | Description |
|------|-------------|
| `x_stream_start` | Start a real-time stream |
| `x_stream_stop` | Stop a stream |
| `x_stream_list` | List active streams |
| `x_stream_pause` | Pause a stream |
| `x_stream_resume` | Resume a paused stream |
| `x_stream_status` | Get stream status and stats |
| `x_stream_history` | Get event history for a stream |

---

## Socket.IO Events

Connect to the API server's Socket.IO endpoint to receive live events:

```javascript
const socket = io('http://localhost:3001');

socket.on('stream:tweet', (data) => {
  console.log('New tweet:', data);
});

socket.on('stream:follower', (data) => {
  console.log('Follower change:', data);
});

socket.on('stream:mention', (data) => {
  console.log('New mention:', data);
});
```

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `interval` | 60s | Polling interval in seconds |
| Min interval | 15s | Minimum allowed polling interval |
| Max interval | 3600s | Maximum polling interval |
| Max history | 200 | Events kept per stream |
| Max errors | 10 | Consecutive errors before auto-stop |
| Redis TTL | 7 days | How long dedup keys are retained |

### Environment Variables

```bash
REDIS_HOST=localhost     # Redis server host
REDIS_PORT=6379          # Redis server port
REDIS_PASSWORD=          # Redis password (if set)
```

---

## Tips

- **Use 60s intervals** for tweets — fast enough without risking rate limits
- **Use 300s intervals** for followers — follower lists change slowly
- **Monitor the history** endpoint to review what was captured while you were away
- **Socket.IO integration** makes it easy to build real-time dashboards or Slack bots
- **Streams auto-stop** after 10 consecutive errors to prevent runaway resource usage

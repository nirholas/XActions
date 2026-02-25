# Real-Time Streaming

> Subscribe to live tweet, follower, and mention events via polling + Socket.IO. No API keys needed.

## Overview

The streaming system provides near-real-time monitoring of Twitter/X activity by polling at configurable intervals and emitting events through Socket.IO. It uses:

- **Bull queue** (Redis) for reliable scheduled polling
- **Browser pool** for managed Puppeteer instances
- **Redis** for deduplication and state persistence
- **Socket.IO** for real-time event emission to clients

---

## Quick Start

### Node.js

```javascript
import { createStream, stopStream, listStreams, setIO } from 'xactions/streaming';

// Optional: connect Socket.IO for real-time events
import { Server } from 'socket.io';
const io = new Server(httpServer);
setIO(io);

// Start a tweet stream
const stream = await createStream({
  type: 'tweet',
  username: 'elonmusk',
  interval: 60,         // Poll every 60 seconds (default)
  authToken: 'your_auth_token'
});

console.log(stream);
// { id: 'abc123', type: 'tweet', username: 'elonmusk', status: 'active', interval: 60000 }

// List active streams
const streams = await listStreams();

// Stop a stream
await stopStream(stream.id);
```

### MCP (AI Agents)

```
"Start monitoring @elonmusk's tweets in real-time"
→ Uses x_stream_start tool

"Show me all active streams"
→ Uses x_stream_list tool

"Stop monitoring @elonmusk"
→ Uses x_stream_stop tool
```

### API

```bash
# Start a stream
curl -X POST http://localhost:3001/api/streams/start \
  -H "Content-Type: application/json" \
  -d '{"type": "tweet", "username": "elonmusk", "interval": 60}'

# List streams
curl http://localhost:3001/api/streams

# Stop a stream
curl -X POST http://localhost:3001/api/streams/stop \
  -d '{"streamId": "abc123"}'
```

---

## Stream Types

| Type | What it monitors | Events emitted |
|------|-----------------|----------------|
| `tweet` | New tweets from a user | `stream:tweet:new` |
| `follower` | Follower count changes | `stream:follower:new`, `stream:follower:lost` |
| `mention` | Mentions of a user | `stream:mention:new` |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | _(none)_ | Redis password |
| `XACTIONS_SESSION_COOKIE` | _(none)_ | Default auth token for streams |

### Interval Limits

| Setting | Value |
|---------|-------|
| Default interval | 60 seconds |
| Minimum interval | 15 seconds |
| Maximum interval | 3,600 seconds (1 hour) |
| Auto-stop threshold | 10 consecutive errors |

---

## Socket.IO Events

Clients can subscribe to real-time events:

```javascript
// Client-side
const socket = io('http://localhost:3001');

socket.on('stream:tweet:new', (data) => {
  console.log('New tweet:', data);
  // { streamId, username, tweet: { text, author, timestamp, url } }
});

socket.on('stream:follower:new', (data) => {
  console.log('New follower:', data);
  // { streamId, username, follower: { username, name } }
});

socket.on('stream:follower:lost', (data) => {
  console.log('Lost follower:', data);
  // { streamId, username, unfollower: { username } }
});

socket.on('stream:mention:new', (data) => {
  console.log('New mention:', data);
  // { streamId, username, mention: { text, author, timestamp } }
});

socket.on('stream:error', (data) => {
  console.log('Stream error:', data);
  // { streamId, error, consecutiveErrors }
});
```

---

## API Reference

### Stream Management

| Function | Signature | Description |
|----------|-----------|-------------|
| `createStream(config)` | `({ type, username, interval?, authToken?, userId? }) → Promise<Object>` | Start a new stream |
| `stopStream(streamId)` | `(string) → Promise<{ success, streamId }>` | Stop and remove a stream |
| `stopAllStreams()` | `() → Promise<{ stopped, failed, total }>` | Emergency shutdown |
| `pauseStream(streamId)` | `(string) → Promise<Object>` | Pause polling, retain state |
| `resumeStream(streamId)` | `(string) → Promise<Object>` | Resume a paused stream |
| `updateStream(streamId, updates)` | `(string, Object) → Promise<Object>` | Update stream config |
| `listStreams()` | `() → Promise<Object[]>` | All active streams |
| `getStreamStatus(streamId)` | `(string) → Promise<Object>` | Detailed stream status |
| `getStreamHistory(streamId, limit?)` | `(string, number?) → Promise<Object[]>` | Recent events |
| `getStreamStats()` | `() → Promise<Object>` | Aggregate statistics |
| `isHealthy()` | `() → Promise<boolean>` | Health check |
| `setIO(io)` | `(SocketIO.Server) → void` | Connect Socket.IO server |
| `shutdown()` | `() → Promise<void>` | Graceful shutdown |

### Browser Pool

| Function | Signature | Description |
|----------|-----------|-------------|
| `acquireBrowser()` | `() → Promise<Browser>` | Get a Puppeteer browser from the pool |
| `releaseBrowser(browser)` | `(Browser) → void` | Return browser to pool |
| `acquirePage(browser)` | `(Browser) → Promise<Page>` | Get a stealth page |
| `releasePage(page)` | `(Page) → Promise<void>` | Close and return page |
| `closeAllBrowsers()` | `() → Promise<void>` | Close all pooled browsers |
| `getBrowserPoolStatus()` | `() → Object` | Pool status and stats |

### Poll Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `pollTweets(username, options)` | `(string, Object) → Promise<Object[]>` | Poll for new tweets |
| `pollFollowers(username, options)` | `(string, Object) → Promise<Object>` | Poll follower changes |
| `pollMentions(username, options)` | `(string, Object) → Promise<Object[]>` | Poll for mentions |

### Constants

| Constant | Value |
|----------|-------|
| `STREAM_TYPES` | `['tweet', 'follower', 'mention']` |

---

## Redis Data Model

Streams persist state in Redis with a 7-day TTL:

```
xactions:stream:{streamId}:state    → { status, lastPoll, consecutiveErrors, ... }
xactions:stream:{streamId}:history  → List of recent events (capped)
xactions:stream:{streamId}:meta     → { type, username, createdAt, ... }
xactions:stream:{streamId}:lock     → Distributed lock for poll coordination
```

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Client App  │◄───│  Socket.IO   │◄───│ Stream Mgr  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐     ┌──────▼──────┐
                    │ Browser Pool │◄───│  Bull Queue  │
                    │ (Puppeteer)  │     │   (Redis)    │
                    └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   x.com     │
                    │  (polling)  │
                    └─────────────┘
```

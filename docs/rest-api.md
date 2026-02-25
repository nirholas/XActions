# XActions REST API Reference

> Complete reference for the XActions Express.js API server. 175+ endpoints for Twitter automation, scraping, analytics, AI agents, and more.

**Base URL:** `http://localhost:3001` (development) | `https://api.xactions.app` (production)

---

## Table of Contents

- [Authentication](#authentication)
- [Health Checks](#health-checks)
- [Profile Management](#profile-management)
- [Content Posting](#content-posting)
- [Engagement](#engagement)
- [Discovery & Search](#discovery--search)
- [Direct Messages](#direct-messages)
- [Bookmarks](#bookmarks)
- [Thread Reader](#thread-reader)
- [Video Download](#video-download)
- [Unfollower Tracking](#unfollower-tracking)
- [Core Operations](#core-operations)
- [Social Graph](#social-graph)
- [Real-Time Streams](#real-time-streams)
- [Workflows](#workflows)
- [Automations](#automations)
- [Analytics & Sentiment](#analytics--sentiment)
- [Creator Tools](#creator-tools)
- [Spaces](#spaces)
- [Settings & Privacy](#settings--privacy)
- [Data Portability](#data-portability)
- [Follower CRM](#follower-crm)
- [Job Scheduler](#job-scheduler)
- [Datasets](#datasets)
- [Notifications](#notifications)
- [Team Management](#team-management)
- [AI Content Optimizer](#ai-content-optimizer)
- [AI Agent API](#ai-agent-api)
- [AI Writer](#ai-writer)
- [Agent Control](#agent-control)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)
- [WebSocket Events](#websocket-events)

---

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "username": "myusername"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "user": { "id": 1, "email": "user@example.com", "username": "myusername" }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer <jwt_token>
```

### Session Auth (Cookie-Based)

For dashboard users, session authentication is also supported via `/api/session`.

---

## Health Checks

```http
GET /health
GET /api/health
```

**Response:**
```json
{ "status": "ok", "service": "xactions-api", "timestamp": "2026-02-25T..." }
```

---

## Profile Management

### Get Profile

```http
GET /api/profile/:username
```

**Response:**
```json
{
  "username": "nichxbt",
  "name": "nich",
  "bio": "Building XActions",
  "followers": 25000,
  "following": 1200,
  "verified": true,
  "location": "Internet",
  "website": "https://xactions.app"
}
```

### Update Profile

```http
PUT /api/profile/update
Content-Type: application/json

{
  "name": "New Name",
  "bio": "Updated bio",
  "location": "New York",
  "website": "https://example.com"
}
```

---

## Content Posting

### Post a Tweet

```http
POST /api/posting/tweet
Content-Type: application/json

{ "text": "Hello from XActions! ⚡" }
```

### Post a Thread

```http
POST /api/posting/thread
Content-Type: application/json

{
  "tweets": [
    "Thread about XActions 🧵",
    "1/ It's free and open source",
    "2/ Works with Claude, Cursor, GPT",
    "3/ No Twitter API fees"
  ]
}
```

### Create a Poll

```http
POST /api/posting/poll
Content-Type: application/json

{
  "question": "Best automation tool?",
  "options": ["XActions", "Manual", "Twitter API"],
  "duration": { "days": 1 }
}
```

### Schedule a Tweet

```http
POST /api/posting/schedule
Content-Type: application/json

{
  "text": "Scheduled tweet!",
  "scheduledAt": "2026-03-01T10:00:00Z"
}
```

### Delete a Tweet

```http
DELETE /api/posting/tweet/:tweetId
```

---

## Engagement

### Like / Unlike

```http
POST   /api/engagement/like/:tweetId
DELETE /api/engagement/like/:tweetId
```

### Reply to a Tweet

```http
POST /api/engagement/reply/:tweetId
Content-Type: application/json

{ "text": "Great point! 🔥" }
```

### Bookmark a Tweet

```http
POST /api/engagement/bookmark/:tweetId
```

### Auto-Like

```http
POST /api/engagement/auto-like
Content-Type: application/json

{
  "keywords": ["AI", "automation"],
  "maxLikes": 50,
  "dryRun": false
}
```

### Get Engagement Analytics

```http
GET /api/engagement/analytics
```

---

## Discovery & Search

### Search Tweets

```http
GET /api/discovery/search?q=xactions&limit=50&filter=latest
```

### Get Trending Topics

```http
GET /api/discovery/trends
```

### Get Explore Feed

```http
GET /api/discovery/explore
```

---

## Direct Messages

### Send DM

```http
POST /api/messages/send
Content-Type: application/json

{
  "username": "targetuser",
  "message": "Hey! Checking out XActions?"
}
```

### Get Conversations

```http
GET /api/messages/conversations
```

### Export DMs

```http
GET /api/messages/export
```

---

## Bookmarks

### Get Bookmarks

```http
GET /api/bookmarks/
```

### Create Bookmark Folder

```http
POST /api/bookmarks/folders
Content-Type: application/json

{ "name": "Research" }
```

### Clear All Bookmarks

```http
DELETE /api/bookmarks/clear
```

---

## Thread Reader

### Unroll a Thread

```http
POST /api/thread/unroll
Content-Type: application/json

{ "url": "https://x.com/user/status/123456789" }
```

**Response:**
```json
{
  "author": "username",
  "tweets": [
    { "text": "1/ Thread starts...", "timestamp": "2026-02-25T...", "likes": 142 }
  ],
  "tweetCount": 12
}
```

### AI Thread Summary

```http
POST /api/thread/summarize
Content-Type: application/json

{ "url": "https://x.com/user/status/123456789" }
```

### Get as Text/Markdown

```http
GET /api/thread/:tweetId/text
GET /api/thread/:tweetId/markdown
```

---

## Video Download

### Extract Video URLs

```http
POST /api/video/extract
Content-Type: application/json

{ "url": "https://x.com/user/status/123456789" }
```

**Response:**
```json
{
  "videos": [
    { "url": "https://video.twimg.com/...", "quality": "720p", "width": 1280, "height": 720 }
  ],
  "thumbnail": "https://pbs.twimg.com/...",
  "author": "username"
}
```

### Proxy Download

```http
GET /api/video/download?url=<video_url>&author=user&tweetId=123
```

---

## Unfollower Tracking

### Trigger a Scan

```http
POST /api/unfollowers/scan
```

### Get History

```http
GET /api/unfollowers/history
```

### Get Stats

```http
GET /api/unfollowers/stats
```

### Get Changes (Gained/Lost)

```http
GET /api/unfollowers/changes
```

### Get Chart Data

```http
GET /api/unfollowers/chart
```

### Manage Auto-Scan Schedule

```http
GET    /api/unfollowers/schedule
POST   /api/unfollowers/schedule    { "interval": "6h" }
DELETE /api/unfollowers/schedule
```

---

## Core Operations

Long-running operations (unfollow, detect) run as background jobs.

### Unfollow Non-Followers

```http
POST /api/operations/unfollow-non-followers
Content-Type: application/json

{
  "username": "myhandle",
  "maxUnfollows": 100,
  "dryRun": true
}
```

### Unfollow Everyone

```http
POST /api/operations/unfollow-everyone
Content-Type: application/json

{
  "username": "myhandle",
  "maxUnfollows": 500
}
```

### Detect Unfollowers

```http
POST /api/operations/detect-unfollowers
Content-Type: application/json

{ "username": "myhandle" }
```

### Check Operation Status

```http
GET /api/operations/status/:operationId
```

### Cancel Operation

```http
POST /api/operations/cancel/:operationId
```

### List All Operations

```http
GET /api/operations/
```

---

## Social Graph

### Build a Graph

```http
POST /api/graph/build
Content-Type: application/json

{
  "username": "nichxbt",
  "depth": 2,
  "maxFollowers": 500,
  "maxNodes": 500,
  "authToken": "your_auth_token"
}
```

### List Graphs

```http
GET /api/graph/
```

### Get Graph Data

```http
GET /api/graph/:id
```

### Get Analysis

```http
GET /api/graph/:id/analysis
```

**Response:**
```json
{
  "totalNodes": 450,
  "totalEdges": 3200,
  "mutualConnections": [{ "a": "alice", "b": "bob" }],
  "bridgeAccounts": [{ "username": "carol", "betweenness": 0.42 }],
  "clusters": [{ "id": 0, "members": ["..."], "size": 45 }],
  "influenceRanking": [{ "username": "nichxbt", "score": 0.87 }],
  "ghostFollowers": [{ "username": "bot123", "reasons": ["no_bio"] }]
}
```

### Get Recommendations

```http
GET /api/graph/:id/recommendations
```

### Export Visualization

```http
GET /api/graph/:id/visualization
GET /api/graph/:id/visualization?format=gexf
GET /api/graph/:id/visualization?format=html
```

### Delete Graph

```http
DELETE /api/graph/:id
```

---

## Real-Time Streams

### Create a Stream

```http
POST /api/streams/
Content-Type: application/json

{
  "type": "tweet",
  "username": "elonmusk",
  "interval": 60
}
```

Types: `tweet`, `follower`, `mention`

### List Streams

```http
GET /api/streams/
```

### Get Stream Status

```http
GET /api/streams/:id
```

### Update Stream

```http
PATCH /api/streams/:id
Content-Type: application/json

{ "interval": 120 }
```

### Pause / Resume

```http
POST /api/streams/:id/pause
POST /api/streams/:id/resume
```

### Get Event History

```http
GET /api/streams/:id/history?limit=50&type=tweet
```

### Stop Stream / Stop All

```http
DELETE /api/streams/:id
DELETE /api/streams/
```

### Get Stats

```http
GET /api/streams/stats
```

---

## Workflows

### Create a Workflow

```http
POST /api/workflows/
Content-Type: application/json

{
  "name": "Daily Growth",
  "trigger": { "type": "cron", "schedule": "0 9 * * *" },
  "steps": [
    { "action": "scrapeProfile", "params": { "username": "myhandle" } },
    { "action": "autoLike", "params": { "keywords": ["AI"], "maxLikes": 20 } }
  ]
}
```

### List / Get / Update / Delete

```http
GET    /api/workflows/
GET    /api/workflows/:id
PUT    /api/workflows/:id
DELETE /api/workflows/:id
```

### Run a Workflow

```http
POST /api/workflows/:id/run
```

### Get Execution History

```http
GET /api/workflows/:id/runs
GET /api/workflows/:id/runs/:runId
```

### List Available Actions

```http
GET /api/workflows/actions
```

### Webhook Trigger

```http
POST /api/workflows/webhook/:webhookId
```

---

## Automations

### Get All Automation Status

```http
GET /api/automations/status
```

### Start / Stop an Automation

```http
POST /api/automations/:name/start
POST /api/automations/:name/stop
```

### Update Settings

```http
POST /api/automations/:name/settings
Content-Type: application/json

{ "maxLikes": 100, "keywords": ["AI", "crypto"] }
```

### Emergency Stop

```http
POST /api/automations/stop-all
```

---

## Analytics & Sentiment

### Analyze Sentiment

```http
POST /api/analytics/sentiment
Content-Type: application/json

{ "text": "XActions is amazing! Best tool ever 🔥" }
```

**Response:**
```json
{
  "score": 0.85,
  "label": "positive",
  "breakdown": { "positive": 0.85, "neutral": 0.12, "negative": 0.03 }
}
```

### Monitor a Target

```http
POST /api/analytics/monitor
Content-Type: application/json

{ "target": "nichxbt", "interval": 300 }
```

### Get Monitoring Results

```http
GET /api/analytics/monitor
GET /api/analytics/monitor/:id
DELETE /api/analytics/monitor/:id
```

### Reputation Report

```http
GET /api/analytics/reports/:username
```

### Alerts

```http
GET /api/analytics/alerts
```

### Tweet-Price Correlation

```http
POST /api/analytics/price-correlation
Content-Type: application/json

{
  "username": "elonmusk",
  "coinId": "bitcoin",
  "days": 30
}
```

### Account History & Growth

```http
GET /api/analytics/history/:username
GET /api/analytics/growth/:username
POST /api/analytics/compare     { "usernames": ["alice", "bob"] }
GET /api/analytics/export/:username
GET /api/analytics/overlap?users=alice,bob,carol
```

---

## Creator Tools

```http
GET /api/creator/analytics
GET /api/creator/revenue
GET /api/creator/subscribers
```

---

## Spaces

```http
GET /api/spaces/live
GET /api/spaces/scheduled
GET /api/spaces/scrape?url=<space_url>
```

---

## Settings & Privacy

```http
GET  /api/settings/
PUT  /api/settings/protected     { "enabled": true }
GET  /api/settings/blocked
GET  /api/settings/muted
POST /api/settings/download-data
```

---

## Data Portability

### Export Account

```http
POST /api/portability/export
Content-Type: application/json

{ "username": "myhandle", "sections": ["profile", "tweets", "followers"] }
```

### Check Export Progress

```http
GET /api/portability/export/:id
```

### Download Export

```http
GET /api/portability/export/:id/download
```

### Migrate to Another Platform

```http
POST /api/portability/migrate
Content-Type: application/json

{
  "username": "myhandle",
  "platform": "bluesky",
  "targetHandle": "myhandle.bsky.social"
}
```

### Compare Exports (Diff)

```http
POST /api/portability/diff
Content-Type: application/json

{ "exportA": "export-id-1", "exportB": "export-id-2" }
```

### List Exports

```http
GET /api/portability/exports
```

---

## Follower CRM

### Sync Followers

```http
POST /api/crm/sync/:username
```

### Tag a Contact

```http
POST /api/crm/tag
Content-Type: application/json

{ "username": "alice", "tag": "VIP" }
```

### Search Contacts

```http
GET /api/crm/search?q=alice&tag=VIP
```

### Get Segment

```http
GET /api/crm/segment/:name
```

### Auto-Score Contacts

```http
POST /api/crm/score
```

---

## Job Scheduler

```http
GET    /api/schedule/                    # List jobs
POST   /api/schedule/                    # Add a job { name, cron, action, params }
DELETE /api/schedule/:name               # Remove a job
POST   /api/schedule/:name/run           # Run now
```

---

## Datasets

Apify-style dataset storage for scraping results.

```http
GET    /api/datasets/                    # List datasets
GET    /api/datasets/:name               # Get items
GET    /api/datasets/:name/export?format=json  # Export (json, csv, jsonl)
DELETE /api/datasets/:name               # Delete
```

---

## Notifications

Multi-channel notification hub (Email, Slack, Discord, Telegram).

```http
POST /api/notifications/send    { "message": "Alert!", "title": "XActions", "severity": "info" }
POST /api/notifications/test/:channel   # channel: email, slack, discord, telegram
POST /api/notifications/configure       # Interactive config
```

---

## Team Management

```http
POST   /api/teams/                       # Create team { name, owner }
GET    /api/teams/:id/members            # List members
POST   /api/teams/:id/invite             # Invite { email, role }
DELETE /api/teams/:id/members/:username   # Remove member
PUT    /api/teams/:id/members/:username/role  # Update role
GET    /api/teams/:id/activity           # Activity log
```

---

## AI Content Optimizer

AI-powered tweet optimization (requires OpenRouter API key).

### Optimize Tweet

```http
POST /api/optimizer/optimize
Content-Type: application/json

{ "text": "Check out this new tool" }
```

**Response:**
```json
{
  "original": "Check out this new tool",
  "optimized": "🔥 Just found the tool that changed how I do Twitter automation.\n\nFree. Open source. No API fees.\n\nThread 🧵",
  "improvements": ["Added hook", "Added emoji", "Created curiosity gap"]
}
```

### Suggest Hashtags

```http
POST /api/optimizer/hashtags
{ "text": "Building open source automation tools" }
```

### Predict Performance

```http
POST /api/optimizer/predict
{ "text": "Your tweet text here" }
```

### Generate Variations

```http
POST /api/optimizer/variations
{ "text": "Original tweet", "count": 5 }
```

---

## AI Agent API

Dedicated endpoints optimized for AI agent consumption. All under `/api/ai/`.

### Scraping

```http
POST /api/ai/scrape/profile      { "username": "nichxbt" }
POST /api/ai/scrape/followers    { "username": "nichxbt", "limit": 100 }
POST /api/ai/scrape/following    { "username": "nichxbt", "limit": 100 }
POST /api/ai/scrape/tweets       { "username": "nichxbt", "limit": 50 }
POST /api/ai/scrape/thread       { "url": "https://x.com/..." }
POST /api/ai/scrape/search       { "query": "AI agents", "limit": 50 }
POST /api/ai/scrape/hashtag      { "hashtag": "xactions" }
POST /api/ai/scrape/media        { "username": "nichxbt" }
```

### Actions

```http
POST /api/ai/action/unfollow-non-followers  { "username": "myhandle" }
POST /api/ai/action/unfollow-everyone       { "username": "myhandle" }
POST /api/ai/action/detect-unfollowers      { "username": "myhandle" }
POST /api/ai/action/auto-like               { "keywords": ["AI"] }
POST /api/ai/action/follow-engagers         { "tweetUrl": "https://..." }
POST /api/ai/action/keyword-follow          { "keywords": ["web3"], "limit": 20 }
GET  /api/ai/action/status/:operationId
```

### Monitoring

```http
POST /api/ai/monitor/account     { "username": "nichxbt" }
POST /api/ai/monitor/followers   { "username": "nichxbt" }
POST /api/ai/monitor/following   { "username": "nichxbt" }
GET  /api/ai/monitor/snapshot/:username
POST /api/ai/alert/new-followers { "username": "nichxbt" }
```

### Utilities

```http
POST /api/ai/download/video      { "url": "https://x.com/..." }
POST /api/ai/export/bookmarks
POST /api/ai/unroll/thread       { "url": "https://x.com/..." }
POST /api/ai/analyze/profile     { "username": "nichxbt" }
```

---

## AI Writer

AI-powered content generation using voice analysis.

```http
POST /api/ai/writer/analyze-voice    { "username": "nichxbt" }
POST /api/ai/writer/generate         { "username": "nichxbt", "topic": "AI tools" }
POST /api/ai/writer/rewrite          { "text": "Original tweet", "style": "engaging" }
POST /api/ai/writer/calendar         { "username": "nichxbt", "topics": ["AI", "automation"] }
POST /api/ai/writer/reply            { "tweetUrl": "https://...", "tone": "friendly" }
GET  /api/ai/writer/voice-profiles
GET  /api/ai/writer/voice-profiles/:username
```

---

## Agent Control

Control the 24/7 LLM-powered thought leadership agent.

```http
GET  /api/agent/status          # Running status & uptime
GET  /api/agent/metrics         # Daily metrics
GET  /api/agent/actions         # Recent action log (paginated)
GET  /api/agent/llm-usage       # LLM cost & token breakdown
GET  /api/agent/config          # Current config
POST /api/agent/config          # Update config
POST /api/agent/start           # Start the agent
POST /api/agent/stop            # Stop the agent
POST /api/agent/feed-score      # Score a tweet for relevance
GET  /api/agent/report          # Growth report (7/30 day)
GET  /api/agent/schedule        # Today's scheduled activities
GET  /api/agent/content         # Content created by agent
```

---

## Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| General API | 100 requests / 15 min |
| Auth (login/register) | 10 attempts / 15 min |
| Video extraction | 30 requests / min |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708902000
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "message": "Descriptive error message",
    "status": 400
  }
}
```

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Server error |

---

## WebSocket Events

Connect via Socket.IO for real-time updates:

```javascript
const socket = io('http://localhost:3001');

// Stream events
socket.on('stream:tweet:new', (data) => { /* new tweet */ });
socket.on('stream:follower:new', (data) => { /* new follower */ });
socket.on('stream:follower:lost', (data) => { /* lost follower */ });
socket.on('stream:mention:new', (data) => { /* new mention */ });
socket.on('stream:error', (data) => { /* stream error */ });

// Operation events
socket.on('operation:progress', (data) => { /* operation progress */ });
socket.on('operation:complete', (data) => { /* operation done */ });

// Analytics alerts
socket.on('alert:follower-spike', (data) => { /* unusual follower activity */ });
socket.on('alert:sentiment-shift', (data) => { /* sentiment change */ });
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `NODE_ENV` | No | `development` | Environment |
| `DATABASE_URL` | Production | — | Prisma database URL |
| `JWT_SECRET` | Production | — | JWT signing secret |
| `SESSION_SECRET` | No | — | Session cookie secret |
| `REDIS_HOST` | No | `localhost` | Redis for streaming/queues |
| `REDIS_PORT` | No | `6379` | Redis port |
| `XACTIONS_SESSION_COOKIE` | No | — | Default X auth token |
| `OPENROUTER_API_KEY` | No | — | For AI writer/optimizer |
| `X402_PAY_TO_ADDRESS` | No | — | Wallet for micropayments |
| `FRONTEND_URL` | No | — | CORS allowed origin |

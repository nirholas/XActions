# Thought Leader Agent — API Reference

> REST API for monitoring, controlling, and configuring the autonomous agent.
>
> Base URL: `http://localhost:3001/api/agent`

---

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [GET /status](#get-status)
  - [GET /metrics](#get-metrics)
  - [GET /actions](#get-actions)
  - [GET /llm-usage](#get-llm-usage)
  - [GET /config](#get-config)
  - [POST /config](#post-config)
  - [POST /start](#post-start)
  - [POST /stop](#post-stop)
  - [POST /feed-score](#post-feed-score)
  - [GET /report](#get-report)
  - [GET /schedule](#get-schedule)
  - [GET /content](#get-content)
- [Error Responses](#error-responses)

---

## Authentication

Agent endpoints do not require JWT auth by default. To add authentication, wrap the route with the `authMiddleware` from `api/middleware/auth.js`.

---

## Endpoints

### GET /status

Returns the agent's running state, uptime, and today's action summary.

**Request:**

```bash
curl http://localhost:3001/api/agent/status
```

**Response:**

```json
{
  "running": true,
  "uptime": 3600000,
  "uptimeHuman": "1h 0m",
  "startedAt": "2026-02-25T10:00:00.000Z",
  "pid": 12345,
  "today": {
    "likes": 42,
    "follows": 8,
    "comments": 5,
    "posts": 2,
    "total": 57
  }
}
```

| Field | Type | Description |
|---|---|---|
| `running` | boolean | Whether the agent is currently active |
| `uptime` | number | Milliseconds since start |
| `uptimeHuman` | string | Human-readable uptime (e.g., `"2d 5h 30m"`) |
| `startedAt` | string\|null | ISO timestamp of when the agent started |
| `pid` | number | Process ID |
| `today` | object\|null | Today's action summary (only when running) |

---

### GET /metrics

Returns daily metrics over a time period for charting growth.

**Request:**

```bash
curl "http://localhost:3001/api/agent/metrics?days=7"
```

**Query Parameters:**

| Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `days` | number | 7 | 90 | Number of days to include |

**Response:**

```json
{
  "followers": [
    { "date": "2026-02-18", "count": 1200 },
    { "date": "2026-02-19", "count": 1215 }
  ],
  "engagement": [
    { "date": "2026-02-18", "likes_given": 80, "comments": 12 }
  ],
  "content": [
    { "date": "2026-02-18", "posts": 3, "impressions": 5400 }
  ]
}
```

---

### GET /actions

Returns the paginated action log.

**Request:**

```bash
curl "http://localhost:3001/api/agent/actions?limit=20&type=like"
```

**Query Parameters:**

| Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | number | 50 | 200 | Number of actions to return |
| `offset` | number | 0 | — | Pagination offset |
| `type` | string | null | — | Filter by action type (`like`, `follow`, `comment`, `post`, `explore`) |

**Response:**

```json
{
  "actions": [
    {
      "id": 142,
      "type": "like",
      "target_id": "1893456789012345678",
      "metadata": "{\"score\":87,\"author\":\"karpathy\"}",
      "timestamp": "2026-02-25T14:23:01.000Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### GET /llm-usage

Returns LLM token consumption and estimated cost.

**Request:**

```bash
curl "http://localhost:3001/api/agent/llm-usage?days=30"
```

**Query Parameters:**

| Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `days` | number | 7 | 90 | Number of days to include |

**Response:**

```json
{
  "usage": [
    {
      "date": "2026-02-25",
      "model": "deepseek/deepseek-chat",
      "calls": 145,
      "input_tokens": 89000,
      "output_tokens": 12000
    },
    {
      "date": "2026-02-25",
      "model": "anthropic/claude-3.5-haiku",
      "calls": 28,
      "input_tokens": 34000,
      "output_tokens": 8500
    }
  ],
  "cost": "$0.1842",
  "costRaw": 0.1842
}
```

---

### GET /config

Returns the current agent configuration with sensitive fields redacted.

**Request:**

```bash
curl http://localhost:3001/api/agent/config
```

**Response:**

```json
{
  "config": {
    "niche": {
      "name": "AI & Engineering",
      "searchTerms": ["AI agents", "LLM engineering"]
    },
    "persona": {
      "name": "Alex",
      "handle": "@alexbuilds"
    },
    "llm": {
      "provider": "openrouter",
      "apiKey": "sk-or-v1...xK9m"
    },
    "limits": {
      "dailyLikes": 100,
      "dailyFollows": 50
    }
  }
}
```

> **Note:** The `apiKey` field is truncated (first 8 + last 4 characters). Proxy URLs are fully redacted.

---

### POST /config

Update the agent configuration. Supports partial updates — only the fields you send will be changed.

**Request:**

```bash
curl -X POST http://localhost:3001/api/agent/config \
  -H "Content-Type: application/json" \
  -d '{"limits": {"dailyLikes": 75}}'
```

**Response:**

```json
{
  "success": true,
  "message": "Config updated"
}
```

---

### POST /start

Start the agent. Fails if already running or no config exists.

**Request:**

```bash
curl -X POST http://localhost:3001/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"configPath": "data/agent-config.json"}'
```

**Body Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `configPath` | string | `data/agent-config.json` | Path to the config file |

**Response (success):**

```json
{
  "success": true,
  "message": "Agent started",
  "startedAt": "2026-02-25T10:00:00.000Z"
}
```

**Response (error):**

```json
{
  "error": "Agent is already running"
}
```

---

### POST /stop

Stop the running agent. Saves session and closes the browser.

**Request:**

```bash
curl -X POST http://localhost:3001/api/agent/stop
```

**Response:**

```json
{
  "success": true,
  "message": "Agent stopped",
  "uptime": "2h 15m"
}
```

---

### POST /feed-score

Score a tweet's relevance to the agent's niche using the LLM Brain.

**Request:**

```bash
curl -X POST http://localhost:3001/api/agent/feed-score \
  -H "Content-Type: application/json" \
  -d '{"text": "Just shipped a new GPT-4 wrapper with RAG support"}'
```

**Response:**

```json
{
  "score": 87,
  "text": "Just shipped a new GPT-4 wrapper with RAG support"
}
```

| Field | Type | Description |
|---|---|---|
| `score` | number | Relevance score 0–100 (0 = irrelevant, 100 = perfect match) |
| `text` | string | Truncated input text (max 140 chars) |

---

### GET /report

Comprehensive growth report over a time period.

**Request:**

```bash
curl "http://localhost:3001/api/agent/report?days=30"
```

**Query Parameters:**

| Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `days` | number | 30 | 90 | Report period in days |

**Response:**

```json
{
  "report": {
    "followers": [
      { "date": "2026-01-26", "count": 950 },
      { "date": "2026-02-25", "count": 1450 }
    ],
    "engagement": [...],
    "content": [...]
  },
  "days": 30
}
```

---

### GET /schedule

Returns today's planned activity schedule from the Scheduler.

**Request:**

```bash
curl http://localhost:3001/api/agent/schedule
```

**Response:**

```json
{
  "schedule": [
    {
      "type": "search-engage",
      "scheduledFor": "2026-02-25T08:30:00.000Z",
      "durationMinutes": 15,
      "intensity": 0.7,
      "query": "AI agents"
    },
    {
      "type": "home-feed",
      "scheduledFor": "2026-02-25T09:15:00.000Z",
      "durationMinutes": 20,
      "intensity": 0.9
    },
    {
      "type": "create-content",
      "scheduledFor": "2026-02-25T11:00:00.000Z",
      "durationMinutes": 10,
      "intensity": 1.0
    }
  ],
  "count": 18
}
```

---

### GET /content

Returns content created by the agent.

**Request:**

```bash
curl "http://localhost:3001/api/agent/content?limit=10"
```

**Query Parameters:**

| Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | number | 20 | 100 | Number of content items |

**Response:**

```json
{
  "content": [
    {
      "id": 15,
      "type": "tweet",
      "text": "Hot take: Most AI wrappers would be better as a bash script.",
      "created_at": "2026-02-25T11:05:00.000Z",
      "impressions": 2400,
      "likes": 47,
      "replies": 12
    }
  ],
  "count": 10
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Descriptive error message"
}
```

| Status | When |
|---|---|
| `400` | Agent already running/stopped, missing required fields |
| `500` | Internal error (database, LLM, browser failure) |

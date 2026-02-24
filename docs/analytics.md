# Sentiment Analysis & Reputation Monitoring

> Real-time sentiment analysis, reputation monitoring, alerting, and reporting for X/Twitter — no API fees.

## Overview

XActions Analytics provides a complete sentiment intelligence layer:

- **Sentiment Analysis** — Rule-based (offline, instant) or LLM-powered (OpenRouter) analysis of any text
- **Reputation Monitoring** — Continuous polling of mentions/keywords with rolling sentiment tracking
- **Alert System** — Threshold, volume spike, and anomaly detection with webhook + Socket.IO delivery
- **Reports** — Comprehensive Markdown/JSON reports with timelines, keyword frequency, and distribution

Available via: **API**, **CLI**, **MCP tools** (for AI agents), and **Dashboard**.

---

## Quick Start

### Analyze sentiment (CLI)

```bash
# Rule-based (instant, offline)
unfollowx sentiment "I love this product! Amazing work 🔥"

# LLM-powered (requires OPENROUTER_API_KEY)
unfollowx sentiment "This is surprisingly mediocre" --mode llm
```

### Start monitoring (CLI)

```bash
# Monitor mentions of @username
unfollowx monitor @elonmusk --type mentions --interval 300

# Monitor a keyword
unfollowx monitor "bitcoin crash" --type keyword --threshold -0.5

# With webhook alerts
unfollowx monitor @yourproject --webhook https://hooks.slack.com/...
```

### Generate report (CLI)

```bash
unfollowx report @username --period 7d --format markdown --output report.md
```

---

## Architecture

```
src/analytics/
├── sentiment.js   → Sentiment analysis engine (rule-based + LLM)
├── reputation.js  → Monitor management, polling, stats
├── alerts.js      → Alert detection and delivery
├── reports.js     → Report generation, Markdown export
└── index.js       → Unified re-exports

api/routes/analytics.js  → REST API endpoints
dashboard/analytics.html → Dashboard UI
dashboard/js/analytics.js → Client-side JS
```

### Data Flow

```
Text → analyzeSentiment() → { score, label, confidence, keywords }
                                     ↓
Monitor (polling) → analyzeBatch() → history[] → checkAlerts()
                                     ↓                ↓
                              _updateStats()    _deliverAlert()
                                     ↓           (console, webhook, Socket.IO)
                          generateReport() → Markdown/JSON
```

---

## API Reference

Base URL: `/api/analytics`

### POST /sentiment

Analyze sentiment of text or batch of texts.

**Single text:**

```json
// Request
{ "text": "I love this! 🔥", "mode": "rules" }

// Response
{
  "score": 0.65,
  "label": "positive",
  "confidence": 0.45,
  "keywords": ["love", "🔥"]
}
```

**Batch mode (up to 100 texts):**

```json
// Request
{ "texts": ["great!", "terrible", "it's ok"], "mode": "rules" }

// Response
{
  "results": [
    { "text": "great!", "score": 0.6, "label": "positive", "confidence": 0.5, "keywords": ["great"] },
    { "text": "terrible", "score": -0.6, "label": "negative", "confidence": 0.5, "keywords": ["terrible"] },
    { "text": "it's ok", "score": 0, "label": "neutral", "confidence": 0, "keywords": [] }
  ],
  "count": 3
}
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | — | Single text to analyze |
| `texts` | string[] | — | Array of texts for batch analysis (max 100) |
| `mode` | string | `"rules"` | `"rules"` (offline) or `"llm"` (OpenRouter) |

**Score range:** -1.0 (very negative) to 1.0 (very positive)
**Labels:** `positive` (>0.05), `neutral` (-0.05 to 0.05), `negative` (<-0.05)

---

### POST /monitor

Start a reputation monitor for a username or keyword.

```json
// Request
{
  "target": "@username",
  "type": "mentions",
  "interval": 900,
  "sentimentMode": "rules",
  "alertConfig": {
    "sentimentThreshold": -0.3,
    "webhookUrl": "https://hooks.example.com/alerts"
  }
}

// Response (201 Created)
{
  "id": "monitor_username_1234567890",
  "target": "@username",
  "type": "mentions",
  "status": "active",
  "intervalMs": 900000,
  "sentimentMode": "rules",
  "alertConfig": { "sentimentThreshold": -0.3, "webhookUrl": "..." },
  "createdAt": "2025-01-15T10:00:00.000Z",
  "lastPolledAt": null,
  "stats": { "totalPolls": 0, "totalTweets": 0, "rollingAverage": 0, "trend": "stable", "volatility": 0 },
  "historyCount": 0
}
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `target` | string | **required** | `@username` or keyword to monitor |
| `type` | string | `"mentions"` | `"mentions"`, `"keyword"`, or `"replies"` |
| `interval` | number | `900` | Polling interval in seconds (min: 60) |
| `sentimentMode` | string | `"rules"` | Sentiment analysis mode |
| `alertConfig.sentimentThreshold` | number | `-0.3` | Alert when avg sentiment drops below |
| `alertConfig.webhookUrl` | string | — | Webhook URL for alert delivery |

---

### GET /monitor

List all active monitors.

```json
// Response
{
  "monitors": [
    { "id": "monitor_username_123", "target": "@username", "type": "mentions", "status": "active", "historyCount": 47, "stats": { ... } }
  ],
  "count": 1
}
```

---

### GET /monitor/:id

Get monitor details and history.

**Query params:** `?limit=100&since=2025-01-01T00:00:00Z`

```json
// Response
{
  "id": "monitor_username_123",
  "target": "@username",
  "status": "active",
  "stats": { "rollingAverage": 0.35, "trend": "improving", "volatility": 0.12 },
  "history": [
    { "timestamp": "...", "score": 0.4, "label": "positive", "text": "...", "author": "user1", "keywords": ["great"] }
  ]
}
```

---

### DELETE /monitor/:id

Stop and remove a monitor. Returns `{ success: true }`.

---

### GET /reports/:username

Generate a reputation report.

**Query params:** `?period=7d&format=json` or `?format=markdown`

| Param | Options | Default |
|-------|---------|---------|
| `period` | `24h`, `7d`, `30d`, `all` | `7d` |
| `format` | `json`, `markdown` | `json` |

**JSON response:**

```json
{
  "target": "username",
  "generatedAt": "2025-01-15T10:00:00.000Z",
  "periodLabel": "Last 7 Days",
  "summary": {
    "totalMentions": 142,
    "averageSentiment": 0.234,
    "medianSentiment": 0.3,
    "trend": "improving",
    "volatility": 0.15,
    "distribution": { "positive": 82, "neutral": 35, "negative": 25 },
    "distributionPercent": { "positive": 58, "neutral": 25, "negative": 18 }
  },
  "topPositive": [ { "text": "...", "score": 0.9, "author": "..." } ],
  "topNegative": [ { "text": "...", "score": -0.8, "author": "..." } ],
  "timeline": [ { "time": "2025-01-14", "averageSentiment": 0.3, "mentions": 20 } ],
  "topKeywords": [ { "word": "amazing", "count": 12 } ],
  "alerts": 2,
  "alertDetails": [ { "type": "volume_spike", "severity": "warning", "message": "..." } ]
}
```

**Markdown response:** Returns a formatted Markdown report with tables, emoji bars, and linked tweets.

---

### GET /alerts

Get recent alerts.

**Query params:** `?monitorId=xxx&severity=warning&limit=50`

```json
{
  "alerts": [
    {
      "id": "alert_1_1234567890",
      "type": "sentiment_threshold",
      "severity": "critical",
      "message": "Sentiment for \"@username\" dropped to -0.650 (threshold: -0.3)",
      "monitorId": "monitor_username_123",
      "target": "@username",
      "data": { "averageScore": -0.65, "threshold": -0.3, "negativeCount": 8, "totalCount": 10 },
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Alert Types

| Type | Trigger | Severity |
|------|---------|----------|
| `sentiment_threshold` | Avg score drops below threshold (default: -0.3) | warning (-0.3) / critical (-0.6) |
| `volume_spike` | Mention count exceeds 3x normal | warning (3x) / critical (6x) |
| `anomaly` | Score shifts >2 standard deviations from baseline | warning (2σ) / critical (3σ) |

**Alert delivery channels:**

1. **Console** — Always logged with emoji indicators
2. **Webhook** — POST to configured URL with `{ event: "xactions.alert", alert: {...} }`
3. **Socket.IO** — Emitted as `analytics:alert` event to monitor room

---

## MCP Tools (AI Agents)

Three tools for Claude, GPT, or any MCP-compatible agent:

### x_analyze_sentiment

```json
{
  "text": "This project is incredible!",
  "mode": "rules"
}
// Or batch:
{ "texts": ["text1", "text2"], "mode": "rules" }
```

### x_monitor_reputation

```json
// Start
{ "action": "start", "target": "@username", "type": "mentions", "interval": 300 }

// Check status
{ "action": "status", "monitorId": "monitor_username_123" }

// Stop
{ "action": "stop", "monitorId": "monitor_username_123" }

// List all
{ "action": "list" }
```

### x_reputation_report

```json
{ "username": "elonmusk", "period": "7d", "format": "markdown" }
```

---

## Sentiment Engine Details

### Rule-Based Mode (`rules`)

Fast, offline analysis using an AFINN-style lexicon:

- **~150 scored words** with scores from -5 (worst) to +5 (best)
- **Negation handling** — "not", "never", "don't" etc. flip and weaken scores by 25%
- **Intensifiers** — "very" (1.5x), "extremely" (2x), "slightly" (0.5x)
- **Emoji scoring** — 20+ emojis mapped to sentiment (😀=3, 😡=-3, 🔥=2)
- **Normalization** — Scores normalized to -1.0 to 1.0 range

**Best for:** High-volume analysis, offline use, cost-sensitive workloads.

### LLM Mode (`llm`)

Uses OpenRouter to call an LLM for nuanced analysis:

- **Default model:** `meta-llama/llama-3.1-8b-instruct:free`
- Handles sarcasm, irony, crypto/finance slang, internet culture
- Structured JSON output with graceful fallback to rule-based on parse failure
- Requires `OPENROUTER_API_KEY` environment variable

**Best for:** Complex/nuanced text, sarcasm detection, specialized domains.

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | For LLM mode | OpenRouter API key |
| `PORT` | No (default: 3000) | Server port |

### Monitor Defaults

| Setting | Default | Min | Description |
|---------|---------|-----|-------------|
| Poll interval | 900s (15min) | 60s | How often to check for new mentions |
| History cap | 10,000 entries | — | Max data points per monitor |
| Alert threshold | -0.3 | -1.0 | Sentiment score that triggers alert |
| Volume multiplier | 3x | — | Mention spike detection multiplier |

---

## Dashboard

Access at `/analytics` — a dark-themed dashboard with four tabs:

1. **Analyze** — Quick text analysis with batch support, sentiment badges, and keyword tags
2. **Monitors** — Start/stop monitors, view status table with rolling averages and trends
3. **Timeline** — Chart.js line+bar chart showing sentiment over time with mentions overlay, word cloud, mention feed
4. **Alerts** — Color-coded alert history with severity badges and timestamps

**Features:**
- Real-time alert notifications via Socket.IO
- Ctrl+Enter keyboard shortcut for analysis
- Responsive layout (sidebar collapses on mobile)
- Accessible (ARIA roles, skip navigation, focus indicators)

---

## Examples

### Analyze a tweet's sentiment

```bash
curl -X POST http://localhost:3000/api/analytics/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "Just shipped v2.0! The team crushed it 🚀🔥"}'
```

### Monitor your brand mentions

```bash
curl -X POST http://localhost:3000/api/analytics/monitor \
  -H "Content-Type: application/json" \
  -d '{"target": "@yourproject", "type": "mentions", "interval": 300}'
```

### Get a weekly report in Markdown

```bash
curl "http://localhost:3000/api/analytics/reports/yourproject?period=7d&format=markdown" > report.md
```

### Batch analyze multiple texts

```bash
curl -X POST http://localhost:3000/api/analytics/sentiment \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Love this!", "Worst update ever", "It works I guess"]}'
```

---

*Built by [@nichxbt](https://x.com/nichxbt) — [XActions](https://github.com/nirholas/XActions)*

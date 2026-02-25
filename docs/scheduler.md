# ⏰ Scheduler & Webhook Triggers

> Cron-based task scheduling with job history, retries, templates, and external webhook triggers. Competes with **Hypefury**, **Buffer**, and **Zapier**.

---

## Overview

The XActions Scheduler lets you automate recurring tasks with:

- **Cron scheduling** — standard cron syntax for any interval
- **Job templates** — pre-built templates for common tasks
- **Retry logic** — configurable max retries with timeout
- **Job history** — timestamped run logs
- **Webhook triggers** — HTTP endpoints to trigger jobs externally
- **Event system** — `job:start`, `job:complete`, `job:error` events

Available via: **CLI**, **MCP tools**, **API**, and **Node.js library**.

---

## Quick Start

### CLI

```bash
# Add a daily snapshot job at 9 AM
unfollowx schedule add daily-snapshot "0 9 * * *" -c snapshot

# Add an hourly engagement check
unfollowx schedule add engagement-check "0 * * * *" -c engagement

# List all jobs
unfollowx schedule list

# Run a job immediately
unfollowx schedule run daily-snapshot

# Remove a job
unfollowx schedule remove daily-snapshot
```

### MCP (AI Agents)

```
Tool: x_schedule_add
Args: { "name": "daily-snapshot", "cron": "0 9 * * *", "command": "snapshot" }

Tool: x_schedule_list
Args: {}

Tool: x_schedule_remove
Args: { "name": "daily-snapshot" }
```

### Node.js

```javascript
import { getScheduler, JOB_TEMPLATES } from 'xactions/src/scheduler/scheduler.js';

const scheduler = getScheduler();
await scheduler.load();

// Add a job
scheduler.addJob({
  name: 'daily-snapshot',
  cron: '0 9 * * *',       // Every day at 9 AM
  command: 'snapshot',
  args: ['nichxbt'],
  enabled: true,
  maxRetries: 2,
  timeout: 300000           // 5 minute timeout
});

// Start the scheduler
scheduler.start();

// Listen for events
scheduler.on('job:complete', ({ name, result, duration }) => {
  console.log(`${name} completed in ${duration}ms`);
});

scheduler.on('job:error', ({ name, error }) => {
  console.error(`${name} failed: ${error.message}`);
});

// Run a job immediately
await scheduler.runJobNow('daily-snapshot');

// View history
const history = await scheduler.getJobHistory('daily-snapshot', 10);

// Stop
scheduler.stop();
```

### API

```bash
# List jobs
GET /api/schedule

# Add a job
POST /api/schedule
{ "name": "daily-snapshot", "cron": "0 9 * * *", "action": "snapshot" }

# Run immediately
POST /api/schedule/daily-snapshot/run

# Remove a job
DELETE /api/schedule/daily-snapshot
```

---

## Architecture

```
src/scheduler/
├── scheduler.js       → Cron engine (node-cron) + job persistence
├── webhookTrigger.js  → Express webhook routes
└── index.js           → Re-exports

api/routes/schedule.js → REST API endpoints
dashboard/calendar.html → Visual calendar UI
```

### Data Storage

- **Jobs:** `~/.xactions/scheduler.json`
- **History:** `~/.xactions/scheduler-history/{jobName}.jsonl`

---

## Cron Syntax

```
┌───────────── minute (0-59)
│ ┌────────────── hour (0-23)
│ │ ┌─────────────── day of month (1-31)
│ │ │ ┌──────────────── month (1-12)
│ │ │ │ ┌───────────────── day of week (0-7, 0/7 = Sun)
│ │ │ │ │
* * * * *
```

| Expression | Schedule |
|---|---|
| `0 9 * * *` | Every day at 9:00 AM |
| `*/30 * * * *` | Every 30 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 9,14,19 * * *` | Three times daily (9 AM, 2 PM, 7 PM) |

---

## Job Templates

Pre-built templates available via `JOB_TEMPLATES`:

| Template | Cron | Description |
|---|---|---|
| `daily-snapshot` | `0 9 * * *` | Daily account metrics snapshot |
| `hourly-trends` | `0 * * * *` | Hourly trending topic check |
| `weekly-cleanup` | `0 3 * * 0` | Weekly non-follower cleanup |
| `engagement-check` | `*/30 * * * *` | Check engagement every 30 min |

---

## Webhook Triggers

External services (Zapier, n8n, IFTTT) can trigger scheduler jobs via HTTP:

### Trigger a Job

```bash
POST /api/webhooks/trigger/daily-snapshot
Content-Type: application/json

{
  "data": { "username": "nichxbt" }
}
```

Optional secret: `POST /api/webhooks/trigger/daily-snapshot?secret=your-secret`

### List Webhook Endpoints

```bash
GET /api/webhooks
```

### Generic Data Ingestion

```bash
POST /api/webhooks/ingest
Content-Type: application/json

{
  "source": "zapier",
  "event": "new_follower",
  "data": { "username": "newuser123" }
}
```

---

## Function Reference

### Scheduler Class

| Method | Description |
|---|---|
| `load()` | Load saved jobs from disk |
| `addJob(config)` | Add a new cron job |
| `removeJob(name)` | Remove a job |
| `enableJob(name)` | Enable a disabled job |
| `disableJob(name)` | Disable a job |
| `listJobs()` | List all jobs with status |
| `getJobHistory(name, limit?)` | Get run history |
| `runJobNow(name)` | Execute immediately |
| `start()` | Start the scheduler daemon |
| `stop()` | Stop all scheduled jobs |

### Events

| Event | Payload | When |
|---|---|---|
| `job:start` | `{ name }` | Job begins execution |
| `job:complete` | `{ name, result, duration }` | Job succeeds |
| `job:error` | `{ name, error }` | Job fails |
| `webhook:received` | `{ source, data }` | Webhook data received |

---

## MCP Tools

| Tool | Input | Description |
|---|---|---|
| `x_schedule_add` | `name`, `cron`, `command` | Add a scheduled job |
| `x_schedule_list` | — | List all jobs |
| `x_schedule_remove` | `name` | Remove a job |

# Task Scheduling

Cron-based local task scheduler for automating XActions operations on a recurring basis. Replaces cloud scheduling services like Phantombuster or Apify schedules.

## Architecture

```
src/scheduler/
├── scheduler.js       # Cron job manager with history and retries
└── webhookTrigger.js  # Webhook-triggered job execution
```

**Storage:** `~/.xactions/scheduler.json` (job definitions), `~/.xactions/scheduler-history/` (execution logs).

## Quick Start

### Node.js

```javascript
import { Scheduler } from 'xactions/src/scheduler/scheduler.js';

const scheduler = new Scheduler();
await scheduler.load();  // Load saved jobs

// Add a job
scheduler.addJob({
  name: 'daily-unfollow-check',
  cron: '0 9 * * *',           // Every day at 9am
  command: 'get_non_followers',
  args: { username: 'nichxbt' },
  enabled: true,
  maxRetries: 3,
  timeout: 60000               // 60s timeout
});

// List jobs
const jobs = scheduler.listJobs();

// Run a job manually
await scheduler.runJob('daily-unfollow-check');

// Remove a job
scheduler.removeJob('daily-unfollow-check');

// Get execution history
const history = scheduler.getHistory('daily-unfollow-check');
```

### CLI

```bash
xactions schedule add daily-check --cron "0 9 * * *" --command get_non_followers --args '{"username":"nichxbt"}'
xactions schedule list
xactions schedule run daily-check
xactions schedule remove daily-check
xactions schedule history daily-check
```

## REST API

All routes prefixed with `/api/schedule`. Requires authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schedule` | List all scheduled jobs |
| POST | `/api/schedule` | Add a new job (requires `name` + `cron`) |
| DELETE | `/api/schedule/:name` | Remove a job by name |
| POST | `/api/schedule/:name/run` | Manually trigger a job |

### Add a scheduled job

```bash
curl -X POST http://localhost:3001/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "follower-snapshot",
    "cron": "0 */6 * * *",
    "command": "get_followers",
    "args": { "username": "nichxbt", "limit": 100 }
  }'
```

## Job Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique job identifier |
| `cron` | Yes | Cron expression (e.g., `0 9 * * *`) |
| `command` | Yes | XActions command/action to execute |
| `args` | No | Parameters passed to the command |
| `enabled` | No | Whether the job is active (default: `true`) |
| `maxRetries` | No | Retry count on failure (default: `0`) |
| `timeout` | No | Execution timeout in ms (default: none) |

## Cron Expression Reference

```
┌───── minute (0-59)
│ ┌───── hour (0-23)
│ │ ┌───── day of month (1-31)
│ │ │ ┌───── month (1-12)
│ │ │ │ ┌───── day of week (0-7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

| Expression | Schedule |
|------------|----------|
| `0 9 * * *` | Daily at 9:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `*/30 * * * *` | Every 30 minutes |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 0 1 * *` | First day of every month |

## Execution History

Each job execution is logged with:

```javascript
{
  jobName: "daily-unfollow-check",
  status: "completed",  // completed | failed | timeout
  startedAt: "2026-02-25T09:00:00Z",
  completedAt: "2026-02-25T09:00:15Z",
  duration: 15000,
  result: { /* command output */ },
  error: null,
  attempt: 1
}
```

History files stored in `~/.xactions/scheduler-history/<jobName>/`.

## Webhook Triggers

Jobs can also be triggered via webhook:

```bash
curl -X POST http://localhost:3001/api/schedule/my-job/run
```

The `webhookTrigger.js` module handles inbound webhook requests and maps them to scheduled job execution.

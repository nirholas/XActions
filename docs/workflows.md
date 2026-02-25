# Workflow Engine

> Declarative JSON pipelines with triggers, conditions, and chained actions. Automate multi-step Twitter operations without code.

## Overview

The workflow engine lets you define automation pipelines as JSON:

- **Steps** execute sequentially with context passing between them
- **Triggers** start workflows automatically (cron, interval, webhook, event)
- **Conditions** gate steps based on runtime data
- **Actions** are the building blocks — scrape, post, follow, analyze, etc.

---

## Quick Start

### Create and Run a Workflow

```javascript
import * as workflows from 'xactions';

// Define a workflow
const definition = {
  name: 'morning-engagement',
  description: 'Like tweets from my niche every morning',
  trigger: { type: 'schedule', cron: '0 9 * * *' },  // 9 AM daily
  steps: [
    {
      action: 'searchTweets',
      params: { query: 'AI startup', limit: 10 },
      output: 'tweets'
    },
    {
      action: 'like',
      params: { tweetIds: '{{tweets}}' },
      onError: 'continue'
    }
  ]
};

// Create (saves + registers trigger)
const workflow = await workflows.create(definition);

// Or run immediately
const run = await workflows.run(definition, {
  authToken: 'your_auth_token'
});

console.log(run.status);    // 'completed'
console.log(run.steps);     // Step-by-step results
```

### MCP (AI Agents)

```
"Create a workflow that scrapes @elonmusk's tweets every hour and analyzes sentiment"
→ Uses x_workflow_create tool

"Run my morning-engagement workflow"
→ Uses x_workflow_run tool

"Show me all my workflows"
→ Uses x_workflow_list tool

"What actions can I use in workflows?"
→ Uses x_workflow_actions tool
```

### API

```bash
# Create a workflow
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{"name": "my-flow", "steps": [{"action": "scrapeProfile", "params": {"username": "elonmusk"}}]}'

# Run a workflow
curl -X POST http://localhost:3001/api/workflows/my-flow/run

# List workflows
curl http://localhost:3001/api/workflows

# Get execution history
curl http://localhost:3001/api/workflows/my-flow/runs
```

---

## Workflow Definition

```javascript
{
  name: 'string (required)',          // Unique workflow name
  description: 'string',             // Human-readable description
  trigger: {                          // How the workflow starts
    type: 'schedule|interval|webhook|event|manual',
    // type-specific config (see Triggers section)
  },
  steps: [                           // Sequential steps
    {
      action: 'string (required)',   // Action name (see Actions)
      params: { ... },               // Action parameters
      output: 'string',              // Save result to context variable
      condition: { ... },            // Optional gate condition
      onError: 'stop|continue',      // Error handling (default: 'stop')
      onFail: 'stop|skip'            // Condition failure handling
    }
  ]
}
```

### Context & Variable Passing

Steps can pass data to subsequent steps via the context:

```javascript
{
  steps: [
    {
      action: 'scrapeProfile',
      params: { username: 'elonmusk' },
      output: 'profile'               // Saves result as context.profile
    },
    {
      action: 'scrapeTweets',
      params: { username: '{{profile.username}}' },
      output: 'tweets'
    },
    {
      condition: {
        field: 'tweets.length',
        operator: 'gt',
        value: 0
      },
      action: 'postTweet',
      params: { text: 'Found {{tweets.length}} tweets from @elonmusk' },
      onFail: 'skip'
    }
  ]
}
```

---

## Triggers

### Schedule (Cron)

```javascript
{ type: 'schedule', cron: '0 9 * * *' }    // 9 AM daily
{ type: 'cron', cron: '*/30 * * * *' }     // Every 30 minutes
```

Uses Bull queue repeatable jobs. Cron syntax: `minute hour day month weekday`.

### Interval

```javascript
{ type: 'interval', ms: 300000 }           // Every 5 minutes
```

Uses `setInterval`. Lighter than cron but less reliable across restarts.

### Webhook

```javascript
{ type: 'webhook' }
// Generates URL: /api/workflows/webhook/{webhookId}
```

POST to the generated URL to trigger the workflow. Payload is passed as initial context.

### Event

```javascript
{ 
  type: 'event', 
  event: 'new_tweet',      // or 'follower_change'
  threshold: 5              // Trigger after 5 events
}
```

Watches for streaming events and triggers when threshold is met.

### Manual

```javascript
{ type: 'manual' }
```

No automatic trigger — must be invoked explicitly via `run()`.

---

## Actions

### Built-in Actions

#### Scrapers

| Action | Params | Description |
|--------|--------|-------------|
| `scrapeProfile` | `{ username }` | Get profile data |
| `scrapeFollowers` | `{ username, limit? }` | List followers |
| `scrapeFollowing` | `{ username, limit? }` | List following |
| `scrapeTweets` | `{ username, limit? }` | Get user tweets |
| `searchTweets` | `{ query, limit?, filter? }` | Search tweets |
| `scrapeHashtag` | `{ hashtag, limit? }` | Scrape hashtag |
| `scrapeTrending` | `{}` | Get trending topics |

#### Automation

| Action | Params | Description |
|--------|--------|-------------|
| `follow` | `{ username }` | Follow a user |
| `unfollow` | `{ username }` | Unfollow a user |
| `postTweet` | `{ text }` | Post a tweet |
| `like` | `{ tweetUrl }` | Like a tweet |
| `retweet` | `{ tweetUrl }` | Retweet |

### Custom Actions

Register your own actions:

```javascript
import { registerAction } from 'xactions';

registerAction('sendDiscordWebhook', {
  description: 'Send a message to Discord',
  category: 'notification',
  params: {
    webhookUrl: { type: 'string', required: true },
    content: { type: 'string', required: true }
  },
  execute: async (params, context) => {
    await fetch(params.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: params.content })
    });
    return { sent: true };
  }
});
```

Plugin actions are also available — see [plugins.md](plugins.md).

---

## Conditions

Gate steps with runtime conditions:

```javascript
{
  condition: {
    field: 'tweets.length',     // Dot-path into context
    operator: 'gt',             // Comparison operator
    value: 0                    // Expected value
  }
}
```

### Available Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ field: 'status', operator: 'eq', value: 'active' }` |
| `neq` | Not equals | `{ field: 'error', operator: 'neq', value: null }` |
| `gt` | Greater than | `{ field: 'count', operator: 'gt', value: 10 }` |
| `gte` | Greater or equal | `{ field: 'score', operator: 'gte', value: 0.8 }` |
| `lt` | Less than | `{ field: 'errors', operator: 'lt', value: 3 }` |
| `lte` | Less or equal | `{ field: 'retries', operator: 'lte', value: 5 }` |
| `contains` | Array/string contains | `{ field: 'tags', operator: 'contains', value: 'ai' }` |
| `exists` | Field exists | `{ field: 'profile.bio', operator: 'exists', value: true }` |

---

## Execution Runs

Every workflow execution produces a run record:

```javascript
{
  id: 'run_abc123',
  workflowId: 'wf_xyz',
  workflowName: 'morning-engagement',
  status: 'completed',           // 'running', 'completed', 'failed', 'cancelled'
  trigger: { type: 'schedule' },
  userId: 'user_123',
  startedAt: '2026-02-25T09:00:00.000Z',
  completedAt: '2026-02-25T09:00:15.000Z',
  stepsCompleted: 2,
  totalSteps: 2,
  steps: [
    { action: 'searchTweets', status: 'completed', duration: 5200, output: { ... } },
    { action: 'like', status: 'completed', duration: 8100, output: { ... } }
  ],
  context: { tweets: [...], ... },
  error: null,
  result: { ... }
}
```

### Query Runs

```javascript
import * as workflows from 'xactions';

// Get all runs for a workflow
const runs = await workflows.runs('morning-engagement', 50);

// Get a specific run
const run = await workflows.getRun('morning-engagement', 'run_abc123');
```

---

## API Reference

### High-Level API

| Function | Signature | Description |
|----------|-----------|-------------|
| `create(definition)` | `(Object) → Promise<Object>` | Save workflow + register trigger |
| `get(idOrName)` | `(string) → Promise<Object\|null>` | Lookup by ID or name |
| `list()` | `() → Promise<Object[]>` | All saved workflows |
| `update(id, updates)` | `(string, Object) → Promise<Object>` | Update + re-register triggers |
| `remove(id)` | `(string) → Promise<boolean>` | Delete + unregister triggers |
| `run(idOrNameOrDef, options?)` | `→ Promise<Object>` | Execute a workflow |
| `runs(workflowId, limit?)` | `→ Promise<Object[]>` | Execution history |
| `getRun(workflowId, runId)` | `→ Promise<Object>` | Specific run |
| `validate(definition)` | `(Object) → { valid, errors[] }` | Validate a workflow |
| `listActions()` | `() → Object[]` | All available actions |
| `registerAction(name, def)` | `(string, Object) → void` | Register custom action |
| `initTriggers(options?)` | `(Object) → void` | Initialize trigger system |
| `shutdown()` | `() → Promise<void>` | Clean up |

### Run Options

| Option | Type | Description |
|--------|------|-------------|
| `trigger` | `Object` | Override trigger data |
| `initialContext` | `Object` | Seed the context |
| `authToken` | `string` | Twitter auth token |
| `userId` | `string` | User ID for tracking |
| `onProgress(event)` | `Function` | Progress callback |
| `isCancelled()` | `Function` | Cancellation check |

---

## Example Workflows

### Competitor Monitor

```javascript
{
  name: 'competitor-monitor',
  trigger: { type: 'schedule', cron: '0 */6 * * *' },
  steps: [
    { action: 'scrapeProfile', params: { username: 'competitor1' }, output: 'profile' },
    { action: 'scrapeTweets', params: { username: 'competitor1', limit: 20 }, output: 'tweets' },
    {
      condition: { field: 'tweets.length', operator: 'gt', value: 0 },
      action: 'analyzeSentiment',
      params: { texts: '{{tweets}}' },
      output: 'sentiment'
    }
  ]
}
```

### Growth Automation

```javascript
{
  name: 'niche-engagement',
  trigger: { type: 'interval', ms: 1800000 },
  steps: [
    { action: 'searchTweets', params: { query: 'AI agents', limit: 5 }, output: 'tweets' },
    { action: 'like', params: { tweetUrl: '{{tweets[0].url}}' }, onError: 'continue' },
    { action: 'follow', params: { username: '{{tweets[0].author}}' }, onError: 'continue' }
  ]
}
```

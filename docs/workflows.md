# Workflow Engine

> Declarative JSON pipelines with triggers, conditions, and chained actions. Automate multi-step Twitter operations without code.

## Overview

The workflow engine lets you define automation pipelines as JSON:

- **Steps** execute sequentially, passing data through a shared context
- **Triggers** start workflows automatically (cron, interval, webhook, event)
- **Conditions** are their own step type, and gate everything after them
- **Actions** are the building blocks: scrape, post, follow, transform, export

Reach it three ways: the CLI (`xactions workflow`), the MCP tools
(`x_workflow_create`, `x_workflow_run`, `x_workflow_list`,
`x_workflow_actions`), or the API server. The module is **not** published as a
package subpath, so a Node import is by relative path from a clone of the repo.

---

## Quick Start

### CLI

```bash
xactions workflow actions                       # every action, with its params
xactions workflow create --file my-flow.json    # or omit --file for the prompts
xactions workflow list
xactions workflow run morning-engagement --auth "$X_AUTH_TOKEN"
xactions workflow runs <workflowId> --limit 10
xactions workflow delete <id>
```

### Node.js

```javascript
import workflows from './src/workflows/index.js';

// Define a workflow
const definition = {
  name: 'morning-engagement',
  description: 'Like tweets from my niche every morning',
  trigger: { type: 'schedule', cron: '0 9 * * *' },  // 9 AM daily
  steps: [
    {
      action: 'searchTweets',
      params: { query: 'AI startup', limit: 10 },
      output: 'tweets',
    },
    {
      action: 'like',
      params: { url: '{{tweets.0.url}}' },
      onError: 'continue',
    },
  ],
};

// Validate before you save. `errors` names exactly what is wrong.
const { valid, errors } = workflows.validate(definition);
if (!valid) throw new Error(errors.join('; '));

// Create (saves + registers the trigger)
const workflow = await workflows.create(definition);

// Or run one immediately, without saving
const run = await workflows.run(definition, { authToken: process.env.X_AUTH_TOKEN });

console.log(run.status);    // 'completed'
console.log(run.steps);     // one entry per step
```

The named exports are the same functions (`create`, `get`, `list`, `update`,
`remove`, `run`, `runs`, `getRun`, `listActions`, `registerAction`,
`executeAction`, `evaluateCondition`, `getAvailableOperators`, `initTriggers`,
`shutdown`), with one difference: `validate` is only on the default export, and
is named `validateWorkflow` when imported by name.

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
  -d '{"name": "my-flow", "steps": [{"action": "scrapeProfile", "params": {"target": "elonmusk"}}]}'

# Run a workflow (by id or name)
curl -X POST http://localhost:3001/api/workflows/my-flow/run

# List workflows, and every available action
curl http://localhost:3001/api/workflows
curl http://localhost:3001/api/workflows/actions

# Execution history, and one run
curl http://localhost:3001/api/workflows/my-flow/runs
curl http://localhost:3001/api/workflows/my-flow/runs/<runId>

# Fire a webhook-triggered workflow (the secret is returned when it is created)
curl -X POST http://localhost:3001/api/workflows/webhook/<webhookId> \
  -H 'X-Webhook-Secret: <secret>' -d '{}'
```

---

## Workflow Definition

```javascript
{
  name: 'string (required)',          // Unique workflow name
  description: 'string',              // Human-readable description
  trigger: {                          // How the workflow starts
    type: 'schedule|cron|interval|webhook|event|manual',
    // type-specific config (see Triggers section)
  },
  steps: [                            // Sequential steps
    // An ACTION step
    {
      action: 'string',               // Action name (see Actions)
      params: { ... },                 // Action parameters
      output: 'string',               // Save the result under this context key
      onError: 'stop|continue',       // On a thrown error (default: 'stop')
    },
    // A CONDITION step
    {
      condition: 'tweets.length > 0', // Or the structured form, see Conditions
      onFail: 'stop|skip',            // When it does not pass (default: 'stop')
    },
  ],
}
```

`validate()` requires `name` (a string) and `steps` (an array), and every step
must carry either `action` or `condition`. A `trigger` object must have a
`type`, and a `schedule` trigger must have a `cron`.

**A step is either an action or a condition, never both.** If a step carries
both keys the condition runs and the action is silently skipped, because the
engine branches on `condition` first. Put the gate in its own step, immediately
before the work it guards.

### Context and variable passing

Every step with an `output` writes its result into a shared context object.
Later steps read it with `{{...}}` interpolation, using dot and index paths.

```javascript
{
  steps: [
    {
      action: 'scrapeProfile',
      params: { target: 'elonmusk' },
      output: 'profile',              // context.profile
    },
    {
      action: 'scrapeTweets',
      params: { target: '{{profile.username}}', limit: 20 },
      output: 'tweets',
    },
    {
      condition: 'tweets.length > 0',
      onFail: 'skip',                 // keep going even if there are none
    },
    {
      action: 'postTweet',
      params: { text: 'Found {{tweets.length}} tweets from @elonmusk' },
    },
  ],
}
```

The context also carries three reserved keys the engine sets for you:
`_workflow` (`{ id, name }`), `_run` (`{ id, trigger }`) and `_timestamp`.
`authToken` is in the context too, and is stripped from the stored run record
along with anything else whose key starts with `_`.

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

POST to the generated URL, with the trigger's `secret` in the `X-Webhook-Secret`
header, to trigger the workflow. Payload is passed as initial context.

On the API server a run, whether triggered or started with `POST /:id/run`,
acts as the workflow's owner: it uses the X session the owner saved with
`POST /api/session/save-session`, and fails with a clear error when there is
none rather than falling back to the server's own `XACTIONS_SESSION_COOKIE`.
The CLI and MCP server run as the machine's own account and still use it.

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

No automatic trigger. Invoke it explicitly with `run()`, `xactions workflow
run`, or `POST /api/workflows/:id/run`. A workflow with no `trigger` at all
behaves the same way.

---

## Actions

31 actions ship built in. `xactions workflow actions` prints the live list with
every parameter; the tables below are that list at the time of writing. A `*`
marks a required parameter.

**The account parameter is called `target`, not `username`, and the tweet
parameter is `url`, not `tweetUrl`.** A step naming the wrong key fails at run
time with a missing-parameter error.

#### Scrapers

| Action | Params | Description |
|--------|--------|-------------|
| `scrapeProfile` | `target*` | Profile with bio, stats and recent tweets |
| `scrapeFollowers` | `target*`, `limit` | Follower list |
| `scrapeFollowing` | `target*`, `limit` | Following list |
| `scrapeTweets` | `target*`, `limit` | An account's tweets |
| `searchTweets` | `query*`, `limit` | Search results |
| `scrapeHashtag` | `hashtag*`, `limit` | Tweets for a hashtag |
| `scrapeTrending` | none | Trending topics |
| `scrapeThread` | `url*` | A full thread or conversation |
| `scrapeMedia` | `target*`, `limit` | Images and video from an account |
| `scrapeBookmarks` | `limit` | Your bookmarks (needs a session) |
| `scrapeNotifications` | `limit` | Your notifications (needs a session) |
| `scrapeListMembers` | `url*`, `limit` | Members of a list |
| `scrapeLikes` | `url*`, `limit` | Accounts that liked one tweet |

#### Automation

| Action | Params | Description |
|--------|--------|-------------|
| `follow` | `target*` | Follow an account |
| `unfollow` | `target*` | Unfollow an account |
| `postTweet` | `text*` | Post a tweet |
| `like` | `url*` | Like a tweet |
| `retweet` | `url*` | Repost a tweet |
| `reply` | `url*`, `text*` | Reply to a tweet |
| `getNonFollowers` | `target*`, `limit` | Accounts you follow that do not follow back |

#### Transform

`input` is the name of a context key, not the value itself.

| Action | Params | Description |
|--------|--------|-------------|
| `filter` | `input*`, `field*`, `operator*`, `value*` | Filter an array by a condition |
| `count` | `input*` | Count items in an array |
| `pick` | `input*`, `fields*` | Keep only these fields on each object |
| `slice` | `input*`, `start`, `end` | Take a subset of an array |

#### AI

| Action | Params | Description |
|--------|--------|-------------|
| `summarize` | `input*`, `provider`, `model`, `prompt` | Summarize text with OpenRouter or a local LLM |
| `generateText` | `prompt*`, `system`, `model` | Generate text |

#### Utility

| Action | Params | Description |
|--------|--------|-------------|
| `log` | `message`, `variable` | Print a message or a context value while debugging |
| `delay` | `ms*` | Wait |
| `exportJSON` | `input*`, `filepath*` | Write a context value to a JSON file |
| `exportCSV` | `input*`, `filepath*` | Write a context value to a CSV file |
| `template` | `text*` | Render a `{{variable}}` string against the context |

### Custom Actions

Register your own actions:

```javascript
import { registerAction } from './src/workflows/index.js';

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

A condition is a step of its own. When it passes, the workflow continues. When
it does not, `onFail: 'skip'` moves to the next step and the default stops the
run, marking it `completed` with a `result.stoppedAtCondition` naming the step.

Four forms are accepted:

```javascript
{ condition: 'tweets.length > 0' }                                 // expression string
{ condition: { left: 'tweets.length', operator: '>', right: 0 } }  // structured
{ condition: { all: ['tweets.length > 0', 'profile.followers > 100'] } }  // AND
{ condition: { any: ['tweets.length > 0', 'media.length > 0'] } }        // OR
```

The structured form uses `left` / `operator` / `right`. There is no `field` /
`value` form, and a condition written that way is reported as an invalid
condition format and treated as not passing.

### Available Operators

`getAvailableOperators()` returns the live list. There are no `eq` / `gt` style
aliases; use the symbols.

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equals, compared as strings | `status == "active"` |
| `!=` | Not equals | `error != "null"` |
| `>` | Greater than, compared as numbers | `tweets.length > 10` |
| `>=` | Greater or equal | `score >= 0.8` |
| `<` | Less than | `errors < 3` |
| `<=` | Less or equal | `retries <= 5` |
| `contains` | Case-insensitive substring | `profile.bio contains "founder"` |
| `not_contains` | The inverse | `profile.bio not_contains "spam"` |
| `matches` | Case-insensitive regular expression | `tweet.text matches "^gm"` |
| `exists` | Not null and not undefined | `profile.bio exists` |
| `empty` | Null, empty string, or empty array | `tweets empty` |
| `not_empty` | The inverse | `tweets not_empty` |

The right-hand side is resolved against the context first, so a bare word is
read as a context path. Quote a literal string (`'active'` or `"active"`).
Numbers, `true`, `false` and `null` are recognised as literals, and so are
duration strings (`30m`, `1h`, `2d`), which resolve to milliseconds. An
expression with no operator is treated as an `exists` check.

---

## Execution Runs

Every workflow execution produces a run record:

```javascript
{
  id: '6c3f...-uuid',
  workflowId: 'wf_xyz',              // 'anonymous' when run() was given a bare definition
  workflowName: 'morning-engagement',
  status: 'completed',               // 'running' | 'completed' | 'failed' | 'cancelled'
  trigger: 'manual',                 // a string, whatever options.trigger was
  userId: 'system',
  startedAt: '2026-02-25T09:00:00.000Z',
  completedAt: '2026-02-25T09:00:15.000Z',
  stepsCompleted: 2,
  totalSteps: 2,
  steps: [
    {
      index: 0,
      type: 'action',                // 'action' | 'condition'
      name: 'searchTweets',
      status: 'completed',           // 'completed' | 'skipped' | 'failed'
      startedAt: '...',
      completedAt: '...',
      result: { /* summarised, large arrays are truncated */ },
      error: null,
    },
  ],
  context: { tweets: [/* ... */] },  // authToken and _-prefixed keys removed
  error: null,
  result: null,
}
```

A run that stops at a condition is `completed`, not `failed`, and its `result`
is `{ stoppedAtCondition, reason, context }`. A step that throws with
`onError: 'continue'` is recorded as `failed` while the run carries on.

### Query Runs

```javascript
import workflows from './src/workflows/index.js';

// Get all runs for a workflow
const runs = await workflows.runs('morning-engagement', 50);

// Get a specific run
const run = await workflows.getRun('morning-engagement', '6c3f...-uuid');
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
| `validate(definition)` | `(Object) → { valid, errors[] }` | Validate a workflow. Named `validateWorkflow` in the named exports. |
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
    { action: 'scrapeProfile', params: { target: 'competitor1' }, output: 'profile' },
    { action: 'scrapeTweets', params: { target: 'competitor1', limit: 20 }, output: 'tweets' },
    { condition: 'tweets not_empty', onFail: 'skip' },
    { action: 'summarize', params: { input: 'tweets', prompt: 'What are they pushing this week?' }, output: 'summary' },
    { action: 'exportJSON', params: { input: 'summary', filepath: './competitor-summary.json' } },
  ],
}
```

`summarize` and `generateText` route through OpenRouter by default and need
`OPENROUTER_API_KEY`. For sentiment scoring specifically, the analytics module
is the better tool: `analyzeSentiment` is not a workflow action. See
[analytics.md](analytics.md).

### Growth Automation

```javascript
{
  name: 'niche-engagement',
  trigger: { type: 'interval', ms: 1800000 },
  steps: [
    { action: 'searchTweets', params: { query: 'AI agents', limit: 5 }, output: 'tweets' },
    { condition: 'tweets not_empty' },
    { action: 'like', params: { url: '{{tweets[0].url}}' }, onError: 'continue' },
    { action: 'follow', params: { target: '{{tweets[0].author}}' }, onError: 'continue' },
  ],
}
```

Write steps go through the same account safety net as everything else: keep the
interval conservative, and remember the MCP server enforces a daily per-action
budget on top ([getting-started.md](getting-started.md#rate-limits--safety)).

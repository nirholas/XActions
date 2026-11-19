# A2A Protocol — XActions

> Google's Agent-to-Agent (A2A) protocol implementation for XActions, enabling inter-agent communication, task delegation, and multi-agent orchestration.

## Overview

XActions implements the [A2A protocol](https://github.com/google/A2A) to allow AI agents (Claude, GPT, Gemini, custom agents) to communicate with the XActions X/Twitter automation toolkit using a standardized protocol.

The A2A server exposes every XActions MCP tool as an A2A skill, supports real-time streaming via SSE, push notifications via webhooks, inter-agent authentication, multi-agent discovery, and complex task orchestration.

## Quick Start

```bash
# Issue a key for the calling agent (printed once)
node src/a2a/index.js --create-key my-agent --preset standard

# Start the A2A server (binds 127.0.0.1:3100)
node src/a2a/server.js

# Verify it's running
curl -H "Authorization: ApiKey xa2a_..." http://localhost:3100/a2a/health
```

## Agent Card

Every A2A-compatible agent publishes a card at `/.well-known/agent.json`:

```json
{
  "name": "XActions Agent",
  "description": "X/Twitter automation agent powered by XActions",
  "url": "http://localhost:3100",
  "version": "1.0.0",
  "provider": {
    "organization": "XActions by @nichxbt",
    "url": "https://xactions.app"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true
  },
  "authentication": {
    "schemes": ["Bearer", "ApiKey"]
  },
  "skills": [
    {
      "id": "xactions.x_get_profile",
      "name": "x_get_profile",
      "description": "Get a Twitter profile by username",
      "tags": ["scraping"],
      "inputSchema": { ... }
    }
  ]
}
```

## Task Lifecycle

Tasks follow a strict state machine:

```
submitted → working → completed
                   → failed
         → canceled
         → input-required → working
```

### Create a task

```bash
curl -X POST http://localhost:3100/a2a/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "get profile for @elonmusk"}]
      }
    },
    "id": "req-1"
  }'
```

### Subscribe with SSE

Use `tasks/sendSubscribe` to get the task ID immediately, then connect to the SSE stream:

```bash
# Create task
curl -X POST http://localhost:3100/a2a/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/sendSubscribe",
    "params": {
      "message": { "role": "user", "parts": [{"type": "text", "text": "scrape followers of @nichxbt"}] }
    },
    "id": "req-2"
  }'

# Connect to stream
curl -N http://localhost:3100/a2a/tasks/<taskId>/stream
```

## Authentication

Every `/a2a` route requires a credential, `/a2a/health` included. Only the
agent card at `/.well-known/agent.json` is public. A server that anyone could
reach would let any web page, or anyone on the network, post and follow as the
account, so authentication is on unless you switch it off explicitly.

Issue an API key for each calling agent. It is printed once and stored only as
a hash under `XACTIONS_HOME`:

```bash
node src/a2a/index.js --create-key my-agent --preset standard
```

Send it as `Authorization: ApiKey <key>`; a JWT goes in
`Authorization: Bearer <token>`:

```bash
curl -H "Authorization: ApiKey xa2a_..." http://localhost:3100/a2a/health
```

| Preset | Permissions | Can run write tools |
|---|---|---|
| `readonly` (default) | `read`, `scrape`, `analytics` | no |
| `standard` | adds `write`, `follow` | yes |
| `full` | every permission, including `admin` (needed for discovery and skill refresh) | yes |

Write tools go through the same safety net as the MCP server: with
`XACTIONS_MCP_REQUIRE_APPROVAL=1` each write is saved as a draft for
`xactions drafts approve`, and every write is charged against the daily action
caps.

| Variable | Effect |
|---|---|
| `A2A_HOST` | Interface to bind. Default `127.0.0.1`; anything else logs a warning |
| `A2A_CORS_ORIGINS` | Comma-separated browser origins allowed to call the API. Default none |
| `XACTIONS_A2A_ALLOW_UNAUTHENTICATED=1` | Turn authentication off (same as `enableAuth: false` or `--no-auth`). Never on a reachable interface |
| `XACTIONS_A2A_ALLOW_PRIVATE=true` | Allow push-notification and discovery URLs on private or loopback addresses (refused by default) |
| `XACTIONS_A2A_KEY` | The key the client helpers in `src/a2a/index.js` send to a running agent |

## Multi-Agent Orchestration

Complex tasks are automatically decomposed:

```bash
curl -X POST http://localhost:3100/a2a/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"description": "analyze @nichxbt and post the findings"}'
```

This decomposes into:
1. Get profile (parallel)
2. Get tweets (parallel)
3. Analyze engagement (depends on 1 & 2)
4. Post findings (depends on 3)

### Get execution plan without running

```bash
curl -X POST http://localhost:3100/a2a/orchestrate/plan \
  -H "Content-Type: application/json" \
  -d '{"description": "compare @nichxbt and @elonmusk"}'
```

## Agent Discovery

```bash
# Discover and register a remote agent
curl -X POST http://localhost:3100/a2a/agents/discover \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://other-agent.example.com"]}'

# List known agents
curl http://localhost:3100/a2a/agents
```

## Programmatic Usage

```javascript
import { createA2AServer } from './src/a2a/index.js';

const agent = createA2AServer({
  port: 3100,
  sessionCookie: process.env.X_SESSION_COOKIE,
  enableAuth: true,
});

await agent.start();

// Use internal APIs
const skills = agent.bridge.parseNaturalLanguage('get profile for @nichxbt');
const result = await agent.orchestrator.execute('analyze @nichxbt and post findings');
```

## Dashboard

Open `dashboard/a2a.html` in a browser (or serve it) to get a real-time monitoring dashboard showing:

- Agent health status
- Skills registry with search
- Connected agents with trust scores
- Live task monitor with SSE
- Orchestration visualizer
- Task composer

## Files

| File | Description |
|------|-------------|
| `src/a2a/types.js` | Constants, factories, validators |
| `src/a2a/skillRegistry.js` | MCP → A2A skill conversion |
| `src/a2a/agentCard.js` | Agent Card generation |
| `src/a2a/taskManager.js` | Task lifecycle management |
| `src/a2a/bridge.js` | A2A ↔ MCP translation |
| `src/a2a/streaming.js` | SSE streaming |
| `src/a2a/push.js` | Push notifications |
| `src/a2a/auth.js` | Authentication |
| `src/a2a/discovery.js` | Agent discovery + trust |
| `src/a2a/orchestrator.js` | Multi-agent orchestrator |
| `src/a2a/server.js` | HTTP server |
| `src/a2a/index.js` | Public API + CLI |
| `dashboard/a2a.html` | Monitoring dashboard |

---
name: a2a-multi-agent
description: Runs XActions as an A2A (Agent-to-Agent) compatible agent that serves an Agent Card, accepts JSON-RPC tasks, bridges them onto the 154 MCP tools, streams progress over SSE, and discovers and delegates to other agents. Use when connecting XActions to external AI agents, building multi-agent orchestration, serving or reading an agent card, running the A2A server, or debugging inter-agent auth, discovery, streaming, or task delegation.
license: Apache-2.0
compatibility: Requires Node.js 18+ and a free port for the A2A HTTP server (3100 by default).
metadata:
  author: nichxbt
  version: "1.0"
---

# Skill: A2A Multi-Agent Orchestration

> Turn XActions into an A2A-compatible agent that can discover, communicate with, and delegate tasks to other AI agents using Google's Agent-to-Agent protocol.

## When to Use

- User wants to connect XActions with external AI agents
- User needs multi-agent orchestration (decompose → delegate → aggregate)
- User asks about A2A protocol, agent cards, or inter-agent communication
- User wants to run the A2A server or manage agent discovery
- User needs real-time task streaming between agents

## Files

| File | Purpose |
|------|---------|
| `src/a2a/types.js` | Shared constants, factories, validators |
| `src/a2a/skillRegistry.js` | MCP tool → A2A skill bridge |
| `src/a2a/agentCard.js` | Agent Card generation (`.well-known/agent.json`) |
| `src/a2a/taskManager.js` | Task lifecycle (create, transition, execute) |
| `src/a2a/bridge.js` | A2A ↔ MCP translation layer + NLP |
| `src/a2a/streaming.js` | SSE streaming for real-time updates |
| `src/a2a/push.js` | Webhook push notifications |
| `src/a2a/auth.js` | API key + JWT inter-agent auth |
| `src/a2a/discovery.js` | Agent registry, skill matching, trust scoring |
| `src/a2a/orchestrator.js` | Task decomposer + delegator + orchestrator |
| `src/a2a/server.js` | Express HTTP server (port 3100) |
| `src/a2a/index.js` | Barrel export + CLI commands + factory |
| `dashboard/a2a.html` | Web dashboard for monitoring |

## Quick Start

### Start the A2A server

```bash
# Via CLI
node src/a2a/server.js

# Directly
node src/a2a/server.js

# With session cookie for browser automation
node src/a2a/server.js --cookie "YOUR_X_SESSION_COOKIE"
```

### Check health

```bash
curl http://localhost:3100/a2a/health
```

### View Agent Card

```bash
curl http://localhost:3100/.well-known/agent.json
```

### Send a task

```bash
curl -X POST http://localhost:3100/a2a/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "get profile for @nichxbt"}]
      }
    },
    "id": "1"
  }'
```

### Discover an agent

```bash
curl -X POST http://localhost:3100/a2a/agents/discover \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://other-agent.example.com"}'
```

### List skills

```bash
curl http://localhost:3100/a2a/skills
curl 'http://localhost:3100/a2a/skills?query=scrape'
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   A2A Protocol Layer                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Agent    │  │   Task   │  │   Streaming /    │  │
│  │  Card     │  │  Manager │  │   Push Notify    │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
│  ┌────┴──────────────┴─────────────────┴──────────┐ │
│  │              HTTP Server (Express)              │ │
│  └────────────────────┬────────────────────────────┘ │
│                       │                              │
│  ┌────────────────────┴────────────────────────────┐ │
│  │        Bridge (A2A ↔ MCP Translation)           │ │
│  └────────────────────┬────────────────────────────┘ │
│                       │                              │
│  ┌────────────────────┴────────────────────────────┐ │
│  │           Skill Registry (140+ tools)           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Discovery  │  │   Auth     │  │ Orchestrator │  │
│  │  + Trust    │  │  (JWT/Key) │  │ (Decompose)  │  │
│  └─────────────┘  └────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Key Concepts

### Agent Card
Every A2A agent publishes a JSON document at `/.well-known/agent.json` describing its capabilities, skills, and supported protocols.

### Skills
XActions converts its 154 MCP tools into A2A skills, each with a unique ID (`xactions.<tool_name>`), description, input schema, and category tags.

### Task Lifecycle
```
submitted → working → completed
                   → failed
         → canceled
         → input-required → working
```

### Trust Scoring
Remote agents are scored 0-100 based on success ratio (40%), longevity (20%), recency (20%), and volume (20%).

### Task Decomposition
Complex natural-language tasks are automatically broken into ordered sub-tasks with dependency tracking (`$step1`, `$step2.field`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/agent.json` | Agent Card |
| POST | `/a2a/tasks` | Create task (tasks/send or tasks/sendSubscribe) |
| GET | `/a2a/tasks/:id` | Get task |
| POST | `/a2a/tasks/:id/cancel` | Cancel task |
| GET | `/a2a/tasks/:id/stream` | SSE stream |
| POST | `/a2a/tasks/:id/message` | Push notification |
| GET | `/a2a/health` | Health check |
| GET | `/a2a/skills` | List skills |
| POST | `/a2a/orchestrate` | Execute orchestrated task |
| POST | `/a2a/orchestrate/plan` | Get execution plan |
| GET | `/a2a/agents` | List discovered agents |
| POST | `/a2a/agents/discover` | Discover remote agents |

## Running and driving the server

The CLI has no A2A subcommand. The A2A agent is an HTTP server, and every
operation is one of the endpoints in the table above.

```bash
# Start it (defaults to port 3100)
node src/a2a/server.js

# Or on another port, with a session attached
A2A_PORT=3200 XACTIONS_SESSION_COOKIE=your_auth_token node src/a2a/server.js
```

```bash
# Is it up?
curl http://localhost:3100/a2a/health

# What can it do?
curl http://localhost:3100/.well-known/agent.json
curl 'http://localhost:3100/a2a/skills?query=scrape'

# Which other agents does it know about?
curl http://localhost:3100/a2a/agents

# Give it a task
curl -X POST http://localhost:3100/a2a/orchestrate \
  -H 'Content-Type: application/json' \
  -d '{"task": "Scrape the profile of @nasa and summarise it"}'
```

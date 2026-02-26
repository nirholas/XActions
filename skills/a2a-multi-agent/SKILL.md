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
xactions a2a start --port 3100

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
xactions a2a discover https://other-agent.example.com
```

### List skills

```bash
xactions a2a skills
xactions a2a skills --query "scrape"
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
XActions converts its 140+ MCP tools into A2A skills, each with a unique ID (`xactions.<tool_name>`), description, input schema, and category tags.

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

## CLI Commands

```
xactions a2a start [--port] [--cookie] [--no-auth]
xactions a2a status [--url]
xactions a2a skills [--query]
xactions a2a agents [--url]
xactions a2a discover <url>
xactions a2a task "<description>"
```

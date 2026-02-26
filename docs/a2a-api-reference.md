# A2A API Reference — XActions

> Complete HTTP API reference for the XActions A2A server.

Base URL: `http://localhost:3100` (default)

---

## Agent Card

### `GET /.well-known/agent.json`

Returns the Agent Card describing this agent's capabilities and skills.

**Response:**
```json
{
  "name": "XActions Agent",
  "description": "X/Twitter automation agent...",
  "url": "http://localhost:3100",
  "version": "1.0.0",
  "provider": { "organization": "XActions by @nichxbt", "url": "https://xactions.app" },
  "capabilities": { "streaming": true, "pushNotifications": true, "stateTransitionHistory": true },
  "authentication": { "schemes": ["Bearer", "ApiKey"] },
  "defaultInputModes": ["text", "data"],
  "defaultOutputModes": ["text", "data"],
  "skills": [ ... ]
}
```

---

## Health

### `GET /a2a/health`

**Response:**
```json
{
  "status": "healthy",
  "agent": "XActions A2A Agent",
  "version": "1.0.0",
  "uptime": 142.5,
  "tasks": { "total": 5, "submitted": 0, "working": 1, "completed": 3, "failed": 1, "canceled": 0 },
  "skills": 140
}
```

---

## Skills

### `GET /a2a/skills`

List all available skills.

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Keyword search |
| `category` | string | Filter by category |
| `limit` | number | Max results |

**Response:**
```json
{
  "skills": [
    {
      "id": "xactions.x_get_profile",
      "name": "x_get_profile",
      "description": "Get a Twitter profile by username",
      "tags": ["scraping"],
      "inputSchema": { "type": "object", "properties": { "username": { "type": "string" } }, "required": ["username"] }
    }
  ],
  "total": 140
}
```

### `POST /a2a/skills/refresh`

Force re-scan of available skills (including plugins).

---

## Tasks

### `POST /a2a/tasks`

Create and optionally execute a task.

**Request body (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        { "type": "text", "text": "get profile for @nichxbt" }
      ]
    },
    "metadata": { "priority": "high" },
    "pushNotification": {
      "url": "https://my-server.com/callbacks",
      "headers": { "X-Secret": "abc" }
    }
  },
  "id": "req-1"
}
```

**Methods:**
| Method | Behavior |
|--------|----------|
| `tasks/send` | Execute synchronously, return completed task |
| `tasks/sendSubscribe` | Return immediately, use SSE for updates |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "id": "abc123",
    "status": { "state": "completed", "timestamp": "..." },
    "history": [ ... ],
    "artifacts": [ { "name": "result", "data": { ... } } ]
  }
}
```

### `GET /a2a/tasks/:taskId`

Get task by ID.

**Response:** Same JSON-RPC shape with the task as `result`.

### `POST /a2a/tasks/:taskId/cancel`

Cancel a task. Only works for `submitted` or `working` tasks.

### `GET /a2a/tasks/:taskId/stream`

SSE stream for real-time updates.

**Events:**
| Event | Data |
|-------|------|
| `status` | `{ "state": "working", "timestamp": "..." }` |
| `artifact` | `{ "name": "...", "data": { ... } }` |
| `progress` | `{ "message": "...", "percent": 50 }` |
| `keepalive` | `{}` |

### `POST /a2a/tasks/:taskId/message`

Send a message to an active task (e.g., for `input-required` state).

---

## Orchestration

### `POST /a2a/orchestrate`

Execute a complex multi-step task.

**Request:**
```json
{
  "description": "analyze @nichxbt and post the findings",
  "options": { "stopOnError": false }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "step": 1, "label": "Get profile: @nichxbt", "success": true },
    { "step": 2, "label": "Get tweets: @nichxbt", "success": true },
    { "step": 3, "label": "Analyze engagement", "success": true },
    { "step": 4, "label": "Post findings", "success": true }
  ],
  "artifacts": [ ... ],
  "errors": []
}
```

### `POST /a2a/orchestrate/plan`

Get an execution plan without running it.

**Request:**
```json
{ "description": "compare @nichxbt and @elonmusk" }
```

**Response:**
```json
{
  "steps": [
    { "step": 1, "skill": "xactions.x_get_profile", "label": "Profile: @nichxbt", "deps": [], "agent": "XActions (self)" },
    { "step": 2, "skill": "xactions.x_get_profile", "label": "Profile: @elonmusk", "deps": [], "agent": "XActions (self)" },
    { "step": 3, "skill": "xactions.x_compare_accounts", "label": "Compare accounts", "deps": ["$step1","$step2"], "agent": "XActions (self)" }
  ],
  "parallel": [[1, 2]],
  "sequential": [3],
  "totalSteps": 3
}
```

---

## Agents

### `GET /a2a/agents`

List discovered remote agents.

### `POST /a2a/agents/discover`

Register remote agents by URL.

**Request:**
```json
{ "urls": ["https://other-agent.example.com"] }
```

---

## Authentication

Requests can be authenticated using:

| Scheme | Header | Format |
|--------|--------|--------|
| API Key | `X-Api-Key` | `xa2a_...` |
| JWT | `Authorization` | `Bearer <token>` |

When `enableAuth: false`, all requests are accepted.

---

## Error Codes

| Code | Meaning |
|------|---------|
| `-32600` | Invalid request |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |
| `-32001` | Task not found |
| `-32002` | Task not cancelable |
| `-32003` | Push notification failed |
| `-32004` | Unsupported operation |
| `-32005` | Content type not supported |

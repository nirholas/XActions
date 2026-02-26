# Build 02-10 — Migrate MCP Server to TypeScript

> **Creates:** `src/mcp/server.ts`, `src/mcp/local-tools.ts` → `.ts`

---

## Task

Convert the 3,898-line MCP server to TypeScript. This is the largest single file in the project. Focus on typing tool definitions, handlers, and MCP SDK integration.

---

## Approach

The MCP server registers 140+ tools. Each tool has:
- `name: string`
- `description: string`
- `inputSchema: JSONSchema`
- `handler: (args) => Promise<MCPToolResult>`

### Key Types

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
}

interface ToolHandler {
  (args: Record<string, unknown>): Promise<ToolResult>;
}

interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Tool registry
const tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();
```

### Migration Strategy

Given the file is 3,898 lines:
1. Extract tool definitions into `src/mcp/tools/` directory (one file per category)
2. Keep `server.ts` as the entry point that imports and registers tools
3. Type each tool handler's expected arguments

### Tool Categories to Extract
- `src/mcp/tools/scraping.ts` — Profile, tweet, follower scraping tools
- `src/mcp/tools/actions.ts` — Post, like, follow, unfollow tools
- `src/mcp/tools/analytics.ts` — Analytics and monitoring tools
- `src/mcp/tools/automation.ts` — Workflow, scheduling tools
- `src/mcp/tools/management.ts` — Profile, list, DM management tools

---

## Acceptance Criteria
- [ ] MCP server compiles as TypeScript
- [ ] Tool definitions are type-safe
- [ ] Handler arguments typed (no `any`)
- [ ] Server file broken into manageable modules
- [ ] `npm run mcp` still works

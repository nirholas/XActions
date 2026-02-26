# Build 02-12 — Migrate Utilities & Plugin System to TypeScript

> **Creates:** `src/utils/core.ts`, `src/plugins/index.ts` → `.ts`

---

## Task

Convert utility modules and the plugin system to TypeScript.

---

## `src/utils/core.ts`
- Type all utility functions: `sleep`, `randomDelay`, `parseNumber`, etc.
- Export typed helper functions

## `src/plugins/index.ts`

```typescript
export interface XActionsPlugin {
  name: string;
  version: string;
  description?: string;

  // Optional hooks
  scrapers?: Record<string, ScraperFunction>;
  tools?: ToolDefinition[];
  routes?: RouteDefinition[];
  actions?: Record<string, ActionFunction>;
  
  // Lifecycle
  init?: (context: PluginContext) => Promise<void>;
  destroy?: () => Promise<void>;
}

interface PluginContext {
  config: Record<string, unknown>;
  logger: Logger;
  scrapers: typeof import('../scrapers/index.js');
}

export async function initializePlugins(pluginNames: string[]): Promise<void>;
export async function installPlugin(name: string): Promise<void>;
export async function removePlugin(name: string): Promise<void>;
export function listPlugins(): PluginInfo[];
export function getPluginTools(): ToolDefinition[];
```

---

## Acceptance Criteria
- [ ] Utils fully typed
- [ ] Plugin interface defined
- [ ] Plugin lifecycle hooks typed
- [ ] Compiles in strict mode

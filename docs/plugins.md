# Plugin System

> Extend XActions with community plugins — add scrapers, MCP tools, automation actions, and API routes via npm packages.

## Overview

The plugin system lets you install, manage, and build plugins that extend every part of XActions:

- **Scrapers** — Add new data sources or platforms
- **MCP Tools** — Register tools that AI agents can call
- **Automation Actions** — Add workflow action steps
- **API Routes** — Mount Express routes on the API server
- **Hooks** — Tap into lifecycle events (before/after actions)

Plugins are standard npm packages following the `xactions-plugin-*` or `@xactions/*` naming convention.

---

## Quick Start

### Install a Plugin

```bash
# Via CLI
xactions plugin install xactions-plugin-bluesky

# Via Node.js
import { installPlugin } from 'xactions/plugins';
await installPlugin('xactions-plugin-bluesky');
```

### List Installed Plugins

```bash
xactions plugin list
```

```javascript
import { listPlugins } from 'xactions/plugins';
const plugins = await listPlugins();
console.log(plugins);
// [{ name: 'xactions-plugin-bluesky', version: '1.0.0', enabled: true, loaded: true }]
```

### Enable / Disable

```javascript
import { enablePlugin, disablePlugin } from 'xactions/plugins';

await disablePlugin('xactions-plugin-bluesky');  // Unloaded from memory
await enablePlugin('xactions-plugin-bluesky');   // Loaded back
```

### Remove a Plugin

```javascript
import { removePlugin } from 'xactions/plugins';
await removePlugin('xactions-plugin-bluesky');
// npm uninstall + removed from config
```

---

## Configuration

Plugins are registered in `~/.xactions/plugins.json`:

```json
{
  "xactions-plugin-bluesky": {
    "enabled": true,
    "installedAt": "2026-01-15T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

The config directory (`~/.xactions/`) is created automatically on first use.

---

## Building a Plugin

### Plugin Interface

Every plugin must export an object with at least `name` and `version`:

```javascript
// xactions-plugin-example/index.js
export default {
  name: 'xactions-plugin-example',
  version: '1.0.0',
  description: 'An example XActions plugin',

  // Optional: MCP tools for AI agents
  tools: [
    {
      name: 'x_example_tool',
      description: 'Does something useful',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      },
      execute: async (params) => {
        return { result: `Searched for: ${params.query}` };
      }
    }
  ],

  // Optional: Scrapers
  scrapers: [
    {
      name: 'example_scraper',
      description: 'Scrapes example.com',
      execute: async (page, options) => {
        // Use Puppeteer page to scrape
        return { data: [] };
      }
    }
  ],

  // Optional: Workflow actions
  actions: [
    {
      name: 'sendSlackNotification',
      description: 'Send a Slack webhook',
      params: {
        webhookUrl: { type: 'string', required: true },
        message: { type: 'string', required: true }
      },
      execute: async (params, context) => {
        await fetch(params.webhookUrl, {
          method: 'POST',
          body: JSON.stringify({ text: params.message })
        });
        return { sent: true };
      }
    }
  ],

  // Optional: Express routes
  routes: [
    {
      method: 'GET',
      path: '/example/status',
      handler: (req, res) => res.json({ status: 'ok' })
    }
  ],

  // Optional: Lifecycle hooks
  hooks: {
    onLoad: () => console.log('Plugin loaded!'),
    onUnload: () => console.log('Plugin unloaded!'),
    beforeAction: (action, params) => {
      console.log(`About to run: ${action}`);
    },
    afterAction: (action, result) => {
      console.log(`Completed: ${action}`);
    }
  }
};
```

### Naming Convention

Plugin npm packages **must** use one of these patterns:
- `xactions-plugin-<name>` (community)
- `@xactions/<name>` (official)

Other names will be rejected by `isValidPluginName()`.

### Validation

Before loading, plugins are validated:

```javascript
import { validatePlugin } from 'xactions/plugins';

const result = validatePlugin(myPlugin);
// { valid: true, errors: [] }
// or
// { valid: false, errors: ['Missing required field: name'] }
```

Required: `name` (string), `version` (string).  
Optional arrays: `tools`, `scrapers`, `actions`, `routes`.  
Optional object: `hooks`.

### Discovery

Scan `node_modules` for installed plugins:

```javascript
import { discoverPlugins } from 'xactions/plugins';
const found = await discoverPlugins();
// ['xactions-plugin-bluesky', 'xactions-plugin-mastodon']
```

---

## API Reference

### Loader Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `readPluginsConfig()` | `() → Promise<Object>` | Read plugin registry from disk |
| `writePluginsConfig(config)` | `(Object) → Promise<void>` | Write registry to disk |
| `isValidPluginName(name)` | `(string) → boolean` | Check naming convention |
| `validatePlugin(mod)` | `(Object) → { valid, errors[] }` | Validate a plugin module |
| `loadPlugin(nameOrPath)` | `(string) → Promise<Object>` | Load a single plugin |
| `loadAllPlugins()` | `() → Promise<Object[]>` | Load all enabled plugins |
| `discoverPlugins()` | `() → Promise<string[]>` | Scan node_modules for plugins |

### Manager Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `installPlugin(name)` | `(string) → Promise<Object>` | Install via npm + load + register |
| `removePlugin(name)` | `(string) → Promise<boolean>` | Unload + npm uninstall + remove config |
| `listPlugins()` | `() → Promise<Object[]>` | All plugins with status |
| `enablePlugin(name)` | `(string) → Promise<void>` | Enable and load |
| `disablePlugin(name)` | `(string) → Promise<void>` | Disable and unload |
| `initializePlugins()` | `() → Promise<number>` | Load all enabled at startup |
| `executeHook(hookName, context)` | `(string, Object) → Promise<void>` | Run hook across all plugins |
| `getPluginTools()` | `() → Object[]` | MCP tools from all plugins |
| `getPluginScrapers()` | `() → Object[]` | Scrapers from all plugins |
| `getPluginRoutes()` | `() → Object[]` | Express routes from all plugins |
| `getPluginActions()` | `() → Object[]` | Workflow actions from all plugins |
| `getPlugin(name)` | `(string) → Object\|undefined` | Get a loaded plugin |
| `getLoadedCount()` | `() → number` | Count of loaded plugins |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PLUGINS_FILE` | `~/.xactions/plugins.json` | Plugin registry path |
| `CONFIG_DIR` | `~/.xactions/` | Config directory |

---

## Integration Points

### MCP Server

Plugin tools are automatically registered in the MCP server at startup:

```javascript
// In src/mcp/server.js
import { initializePlugins, getPluginTools } from 'xactions/plugins';
await initializePlugins();
const pluginTools = getPluginTools();
// Tools are registered alongside built-in tools
```

### API Server

Plugin routes are mounted on the Express app:

```javascript
// In api/server.js
const pluginRoutes = getPluginRoutes();
pluginRoutes.forEach(route => {
  app[route.method.toLowerCase()](route.path, route.handler);
});
```

### Workflow Engine

Plugin actions are available in workflows:

```json
{
  "name": "my-workflow",
  "steps": [
    {
      "action": "sendSlackNotification",
      "params": {
        "webhookUrl": "https://hooks.slack.com/...",
        "message": "Workflow completed!"
      }
    }
  ]
}
```

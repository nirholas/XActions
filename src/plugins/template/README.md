# xactions-plugin-example

> Example XActions plugin — use as a template for building your own.

## What It Does

This plugin demonstrates all the extension points available in the XActions plugin system:

- **Scraper**: `scrapeTrendingTopics` — scrapes trending topics from X/Twitter Explore
- **MCP Tool**: `x_get_trending_topics` — exposes the scraper to AI agents (Claude, GPT)
- **API Route**: `GET /api/plugins/xactions-plugin-example/trending`
- **Browser Action**: `getTrending` — paste-and-run script for the console
- **Lifecycle Hooks**: `onLoad`, `onUnload`, `beforeAction`, `afterAction`

## Creating Your Own Plugin

### 1. Create a new npm package

```bash
mkdir xactions-plugin-myplugin
cd xactions-plugin-myplugin
npm init -y
```

### 2. Set the package name

Name it `xactions-plugin-*` or scope it as `@xactions/*`:

```json
{
  "name": "xactions-plugin-myplugin",
  "type": "module",
  "main": "index.js"
}
```

### 3. Export the plugin interface

```javascript
// index.js
export default {
  name: 'xactions-plugin-myplugin',
  version: '1.0.0',
  description: 'My custom plugin',

  // Puppeteer scraper functions
  scrapers: [
    {
      name: 'myCustomScraper',
      description: 'Scrapes something useful',
      handler: async (page, options) => { /* ... */ },
    },
  ],

  // MCP tools for AI agents
  tools: [
    {
      name: 'x_my_custom_tool',
      description: 'Does something useful via AI',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async (args, context) => { /* ... */ },
    },
  ],

  // Express routes
  routes: [
    {
      method: 'get',
      path: '/my-endpoint',
      handler: (req, res) => res.json({ ok: true }),
    },
  ],

  // Browser console actions
  actions: [
    {
      name: 'myAction',
      description: 'Does something on x.com',
      script: '(() => { console.log("hello from plugin"); })()',
    },
  ],

  // Lifecycle hooks
  hooks: {
    onLoad() { console.log('Plugin loaded'); },
    onUnload() { console.log('Plugin unloaded'); },
    beforeAction(ctx) { /* runs before any automation action */ },
    afterAction(ctx) { /* runs after any automation action */ },
  },
};
```

### 4. Install into XActions

```bash
# From npm
xactions plugin install xactions-plugin-myplugin

# Or from a local directory
xactions plugin install ./path/to/plugin
```

### 5. Verify

```bash
xactions plugin list
```

## Plugin Interface Reference

| Export | Type | Description |
|--------|------|-------------|
| `name` | `string` | **Required.** Unique plugin name |
| `version` | `string` | **Required.** Semver version |
| `description` | `string` | Human-readable description |
| `scrapers` | `Array<{ name, description, handler }>` | Puppeteer scraper functions |
| `tools` | `Array<{ name, description, inputSchema, handler }>` | MCP tool definitions |
| `routes` | `Array<{ method, path, handler }>` | Express route handlers |
| `actions` | `Array<{ name, description, script }>` | Browser console scripts |
| `hooks` | `{ onLoad, onUnload, beforeAction, afterAction }` | Lifecycle hooks |
